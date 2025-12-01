// =============================================================================
// MARK BACKEND - LAUNCH APPLICATIONS API ROUTES
// =============================================================================

import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { apiRateLimiter, verifyCaptcha } from '../middleware/security';
import { optionalAuth } from '../middleware/auth';
import { AuthenticatedRequest, ApplicationInput } from '../types';
import { logger } from '../utils/logger';
import { sanitizeEmail, isValidEmail } from '../utils/security';

const router = Router();

// =============================================================================
// POST /applications - Submit a launch application
// =============================================================================

router.post(
  '/',
  apiRateLimiter,
  verifyCaptcha,
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const input: ApplicationInput = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Validate required fields
      if (!input.applicantName || !input.applicantEmail || !input.type || !input.description) {
        res.status(400).json({
          success: false,
          error: 'Name, email, type, and description are required',
        });
        return;
      }

      // Validate email
      const email = sanitizeEmail(input.applicantEmail);
      if (!isValidEmail(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
        return;
      }

      // Validate application type
      const validTypes = ['CRYPTO_LAUNCH', 'BUSINESS_RAISE', 'PARTNERSHIP', 'OTHER'];
      if (!validTypes.includes(input.type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid application type',
        });
        return;
      }

      // Check for duplicate applications (same email + type within 24 hours)
      const recentApplication = await prisma.launchApplication.findFirst({
        where: {
          applicantEmail: email,
          type: input.type as any,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (recentApplication) {
        res.status(400).json({
          success: false,
          error: 'You have already submitted an application of this type recently',
        });
        return;
      }

      const application = await prisma.launchApplication.create({
        data: {
          userId: req.user?.userId,
          applicantName: input.applicantName,
          applicantEmail: email,
          applicantRole: input.applicantRole,
          companyName: input.companyName,
          website: input.website,
          type: input.type as any,
          description: input.description,
          raiseAmount: input.raiseAmount,
          timeline: input.timeline,
          twitter: input.twitter,
          discord: input.discord,
          telegram: input.telegram,
          referralSource: input.referralSource,
          ipAddress: ip,
          userAgent,
          status: 'NEW',
        },
      });

      await logger.info('SYSTEM', 'APPLICATION_SUBMITTED', `New ${input.type} application from ${email}`, {
        applicationId: application.id,
        companyName: input.companyName,
      });

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully. Our team will review and contact you within 3-5 business days.',
        data: {
          id: application.id,
          type: application.type,
          status: application.status,
        },
      });
    } catch (error) {
      await logger.error('SYSTEM', 'APPLICATION_ERROR', 'Failed to submit application', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit application',
      });
    }
  }
);

// =============================================================================
// GET /applications/mine - Get user's applications (if logged in)
// =============================================================================

router.get(
  '/mine',
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Login required to view your applications',
        });
        return;
      }

      const applications = await prisma.launchApplication.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          companyName: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
        },
      });

      res.json({
        success: true,
        data: applications,
      });
    } catch (error) {
      await logger.error('SYSTEM', 'GET_APPLICATIONS_ERROR', 'Failed to get applications', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get applications',
      });
    }
  }
);

export default router;
