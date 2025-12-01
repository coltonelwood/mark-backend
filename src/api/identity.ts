// =============================================================================
// MARK BACKEND - IDENTITY VERIFICATION API ROUTES
// =============================================================================
// Note: This integrates with external identity providers (Persona, Jumio, etc.)
// We only store metadata, never PII directly
// =============================================================================

import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/security';
import { trustScoreService } from '../services/TrustScoreService';
import { config } from '../config';
import { AuthenticatedRequest, IdentityVerificationStart, IdentityVerificationResult } from '../types';
import { logger } from '../utils/logger';
import { generateSecureToken } from '../utils/security';

const router = Router();

// =============================================================================
// POST /identity/start - Start identity verification
// =============================================================================

router.post(
  '/start',
  authenticate,
  apiRateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { level, redirectUrl } = req.body as IdentityVerificationStart;

      // Check if user already has a verification in progress or completed
      const existing = await prisma.privateIdentityVerification.findUnique({
        where: { userId },
      });

      if (existing) {
        if (existing.status === 'VERIFIED' && existing.expiresAt && existing.expiresAt > new Date()) {
          res.status(400).json({
            success: false,
            error: 'You are already verified',
            data: {
              status: existing.status,
              level: existing.level,
              expiresAt: existing.expiresAt,
            },
          });
          return;
        }

        if (existing.status === 'PENDING' || existing.status === 'IN_REVIEW') {
          res.status(400).json({
            success: false,
            error: 'You already have a verification in progress',
            data: {
              status: existing.status,
            },
          });
          return;
        }

        // Check retry limit
        if (existing.retryCount >= 3) {
          res.status(400).json({
            success: false,
            error: 'Maximum verification attempts reached. Please contact support.',
          });
          return;
        }
      }

      // Generate a session ID for the identity provider
      const sessionId = generateSecureToken(32);

      // In production, you would call the identity provider API here
      // Example with Persona:
      // const inquiryResponse = await fetch('https://api.withpersona.com/api/v1/inquiries', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${config.identity.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     data: {
      //       attributes: {
      //         'inquiry-template-id': config.identity.templateId,
      //         'reference-id': userId,
      //       },
      //     },
      //   }),
      // });

      // Create or update verification record
      const verification = await prisma.privateIdentityVerification.upsert({
        where: { userId },
        create: {
          userId,
          status: 'PENDING',
          level: level || 'standard',
          provider: config.identity.provider,
          providerSessionId: sessionId,
          lastAttemptAt: new Date(),
        },
        update: {
          status: 'PENDING',
          level: level || 'standard',
          providerSessionId: sessionId,
          lastAttemptAt: new Date(),
          retryCount: existing ? { increment: 1 } : undefined,
          rejectionReason: null,
        },
      });

      await logger.audit('IDENTITY', 'VERIFICATION_STARTED', `User ${userId} started identity verification`, userId);

      // In production, return the provider's verification URL
      // For now, return a placeholder
      res.json({
        success: true,
        data: {
          id: verification.id,
          status: verification.status,
          sessionId,
          // In production:
          // verificationUrl: inquiryResponse.data.attributes['inquiry-url'],
          verificationUrl: `${config.cors.origin}/verify/${sessionId}`,
          provider: config.identity.provider,
        },
      });
    } catch (error) {
      await logger.error('IDENTITY', 'START_ERROR', 'Failed to start identity verification', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to start identity verification',
      });
    }
  }
);

// =============================================================================
// GET /identity/status - Get current verification status
// =============================================================================

router.get(
  '/status',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const verification = await prisma.privateIdentityVerification.findUnique({
        where: { userId },
      });

      if (!verification) {
        res.json({
          success: true,
          data: {
            status: 'NOT_STARTED',
            level: null,
            verifiedAt: null,
            expiresAt: null,
            isAccredited: false,
          } as IdentityVerificationResult,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: verification.id,
          status: verification.status,
          level: verification.level,
          verifiedAt: verification.verifiedAt,
          expiresAt: verification.expiresAt,
          isAccredited: verification.isAccredited,
          rejectionReason: verification.status === 'REJECTED' ? verification.rejectionReason : undefined,
          retryCount: verification.retryCount,
        } as IdentityVerificationResult,
      });
    } catch (error) {
      await logger.error('IDENTITY', 'STATUS_ERROR', 'Failed to get verification status', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get verification status',
      });
    }
  }
);

// =============================================================================
// POST /identity/webhook - Handle provider webhook (called by identity provider)
// =============================================================================

router.post(
  '/webhook',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // In production, verify webhook signature from provider
      // const signature = req.headers['x-persona-signature'];
      // if (!verifyWebhookSignature(signature, req.body)) {
      //   res.status(401).json({ success: false, error: 'Invalid signature' });
      //   return;
      // }

      const { event, data } = req.body;

      // Find verification by provider session ID
      const sessionId = data?.sessionId || data?.attributes?.['reference-id'];
      if (!sessionId) {
        res.status(400).json({ success: false, error: 'Missing session ID' });
        return;
      }

      const verification = await prisma.privateIdentityVerification.findFirst({
        where: { providerSessionId: sessionId },
      });

      if (!verification) {
        res.status(404).json({ success: false, error: 'Verification not found' });
        return;
      }

      // Handle different webhook events
      let newStatus = verification.status;
      let verifiedAt: Date | null = null;
      let expiresAt: Date | null = null;
      let rejectionReason: string | null = null;

      switch (event) {
        case 'inquiry.completed':
        case 'verification.completed':
          newStatus = 'IN_REVIEW';
          break;

        case 'inquiry.approved':
        case 'verification.approved':
          newStatus = 'VERIFIED';
          verifiedAt = new Date();
          // Verification valid for 1 year
          expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          break;

        case 'inquiry.declined':
        case 'verification.declined':
          newStatus = 'REJECTED';
          rejectionReason = data?.attributes?.['decline-reason'] || 'Verification declined';
          break;

        case 'inquiry.expired':
          newStatus = 'EXPIRED';
          break;
      }

      // Update verification record
      await prisma.privateIdentityVerification.update({
        where: { id: verification.id },
        data: {
          status: newStatus as any,
          providerStatus: event,
          verifiedAt,
          expiresAt,
          rejectionReason,
        },
      });

      // If verified, trigger trust score update
      if (newStatus === 'VERIFIED') {
        await trustScoreService.onIdentityVerified(verification.userId);
        await logger.audit('IDENTITY', 'VERIFICATION_COMPLETED', `User ${verification.userId} identity verified`, verification.userId);
      }

      res.json({ success: true });
    } catch (error) {
      await logger.error('IDENTITY', 'WEBHOOK_ERROR', 'Failed to process identity webhook', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
      });
    }
  }
);

// =============================================================================
// POST /identity/simulate (DEVELOPMENT ONLY)
// =============================================================================

if (config.isDevelopment) {
  router.post(
    '/simulate',
    authenticate,
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const userId = req.user!.userId;
        const { action } = req.body; // 'approve' | 'reject'

        const verification = await prisma.privateIdentityVerification.findUnique({
          where: { userId },
        });

        if (!verification) {
          res.status(404).json({
            success: false,
            error: 'No verification found. Start verification first.',
          });
          return;
        }

        if (action === 'approve') {
          await prisma.privateIdentityVerification.update({
            where: { id: verification.id },
            data: {
              status: 'VERIFIED',
              verifiedAt: new Date(),
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              rejectionReason: null,
            },
          });

          await trustScoreService.onIdentityVerified(userId);

          res.json({
            success: true,
            message: 'Verification simulated as APPROVED',
          });
        } else {
          await prisma.privateIdentityVerification.update({
            where: { id: verification.id },
            data: {
              status: 'REJECTED',
              rejectionReason: 'Simulated rejection for testing',
            },
          });

          res.json({
            success: true,
            message: 'Verification simulated as REJECTED',
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to simulate verification',
        });
      }
    }
  );
}

export default router;
