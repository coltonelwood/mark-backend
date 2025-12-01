// =============================================================================
// MARK BACKEND - CONTACT & APPLICATIONS PUBLIC API ROUTES
// =============================================================================

import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { apiRateLimiter, verifyCaptcha } from '../middleware/security';
import { optionalAuth } from '../middleware/auth';
import { AuthenticatedRequest, ContactInput, ApplicationInput } from '../types';
import { logger } from '../utils/logger';
import { sanitizeEmail } from '../utils/security';

const router = Router();

// =============================================================================
// POST /contact - Submit a contact message
// =============================================================================

router.post(
  '/',
  apiRateLimiter,
  verifyCaptcha,
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const input: ContactInput = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Validate required fields
      if (!input.name || !input.email || !input.message) {
        res.status(400).json({
          success: false,
          error: 'Name, email, and message are required',
        });
        return;
      }

      // Validate email format
      const email = sanitizeEmail(input.email);
      if (!email || !email.includes('@')) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
        return;
      }

      // Check for spam (simple duplicate check)
      const recentMessage = await prisma.contactMessage.findFirst({
        where: {
          email,
          createdAt: {
            gte: new Date(Date.now() - 60 * 1000), // Within last minute
          },
        },
      });

      if (recentMessage) {
        res.status(429).json({
          success: false,
          error: 'Please wait before sending another message',
        });
        return;
      }

      const message = await prisma.contactMessage.create({
        data: {
          userId: req.user?.userId,
          name: input.name,
          email,
          subject: input.subject,
          message: input.message,
          category: input.category,
          ipAddress: ip,
          userAgent,
          status: 'NEW',
        },
      });

      await logger.info('SYSTEM', 'CONTACT_MESSAGE', `New contact message from ${email}`, {
        messageId: message.id,
        category: input.category,
      });

      res.status(201).json({
        success: true,
        message: 'Message received. We will respond within 24-48 hours.',
        data: {
          id: message.id,
        },
      });
    } catch (error) {
      await logger.error('SYSTEM', 'CONTACT_ERROR', 'Failed to submit contact message', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit message',
      });
    }
  }
);

export default router;
