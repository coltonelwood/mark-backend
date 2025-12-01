// =============================================================================
// MARK BACKEND - ADMIN API ROUTES
// =============================================================================

import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth';
import { adminRateLimiter } from '../middleware/security';
import { trustScoreService } from '../services/TrustScoreService';
import { AuthenticatedRequest, AdminStatusUpdate, TrustScoreAdjustment } from '../types';
import { logger } from '../utils/logger';
import { ProjectStatus, BusinessStatus, MessageStatus, ApplicationStatus } from '@prisma/client';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);
router.use(adminRateLimiter);

// =============================================================================
// PROJECTS ADMIN
// =============================================================================

/**
 * GET /admin/projects - List all projects with filters
 */
router.get('/projects', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, search, minTrustScore, page = 1, limit = 20 } = req.query;

    const where: any = {};
    
    if (status) {
      where.status = status as ProjectStatus;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { symbol: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    if (minTrustScore) {
      where.trustScore = { gte: Number(minTrustScore) };
    }

    const [projects, total] = await Promise.all([
      prisma.cryptoProject.findMany({
        where,
        include: {
          user: {
            select: { email: true, displayName: true, walletAddress: true },
          },
          _count: {
            select: { documents: true, trustScoreEvents: true },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.cryptoProject.count({ where }),
    ]);

    res.json({
      success: true,
      data: projects,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    await logger.error('ADMIN', 'LIST_PROJECTS_ERROR', 'Failed to list projects', error as Error);
    res.status(500).json({ success: false, error: 'Failed to list projects' });
  }
});

/**
 * PATCH /admin/projects/:id/status - Update project status
 */
router.patch('/projects/:id/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason, internalNote }: AdminStatusUpdate = req.body;
    const adminId = req.user!.userId;

    const validStatuses: ProjectStatus[] = ['IN_REVIEW', 'APPROVED', 'REJECTED', 'LIVE', 'PAUSED'];
    if (!validStatuses.includes(status as ProjectStatus)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }

    const project = await prisma.cryptoProject.update({
      where: { id },
      data: {
        status: status as ProjectStatus,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: status === 'REJECTED' ? reason : null,
        isVerified: status === 'APPROVED' || status === 'LIVE',
      },
    });

    // Add admin note if provided
    if (internalNote) {
      await prisma.adminNote.create({
        data: {
          authorId: adminId,
          projectId: id,
          note: internalNote,
          isInternal: true,
        },
      });
    }

    await logger.audit('ADMIN', 'PROJECT_STATUS_UPDATED', `Admin updated project ${id} status to ${status}`, adminId);

    res.json({ success: true, data: project });
  } catch (error) {
    await logger.error('ADMIN', 'UPDATE_PROJECT_STATUS_ERROR', 'Failed to update project status', error as Error);
    res.status(500).json({ success: false, error: 'Failed to update project status' });
  }
});

// =============================================================================
// BUSINESSES ADMIN
// =============================================================================

/**
 * GET /admin/businesses - List all businesses with filters
 */
router.get('/businesses', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, kybLevel, search, page = 1, limit = 20 } = req.query;

    const where: any = {};
    
    if (status) {
      where.status = status as BusinessStatus;
    }
    
    if (kybLevel) {
      where.kybLevel = kybLevel;
    }
    
    if (search) {
      where.OR = [
        { legalName: { contains: search as string, mode: 'insensitive' } },
        { dba: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        include: {
          user: {
            select: { email: true, displayName: true },
          },
          founders: true,
          _count: {
            select: { documents: true, revenueReports: true },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.business.count({ where }),
    ]);

    res.json({
      success: true,
      data: businesses,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    await logger.error('ADMIN', 'LIST_BUSINESSES_ERROR', 'Failed to list businesses', error as Error);
    res.status(500).json({ success: false, error: 'Failed to list businesses' });
  }
});

/**
 * PATCH /admin/businesses/:id/status - Update business status
 */
router.patch('/businesses/:id/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason, internalNote }: AdminStatusUpdate = req.body;
    const adminId = req.user!.userId;

    const validStatuses: BusinessStatus[] = ['IN_REVIEW', 'KYB_PENDING', 'KYB_VERIFIED', 'APPROVED', 'REJECTED', 'LIVE', 'PAUSED'];
    if (!validStatuses.includes(status as BusinessStatus)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }

    const business = await prisma.business.update({
      where: { id },
      data: {
        status: status as BusinessStatus,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: status === 'REJECTED' ? reason : null,
        isVerified: status === 'APPROVED' || status === 'LIVE',
        kybVerifiedAt: status === 'KYB_VERIFIED' ? new Date() : undefined,
      },
    });

    // Add admin note if provided
    if (internalNote) {
      await prisma.adminNote.create({
        data: {
          authorId: adminId,
          businessId: id,
          note: internalNote,
          isInternal: true,
        },
      });
    }

    // Recalculate trust score
    await trustScoreService.calculateBusinessScore(id);

    await logger.audit('ADMIN', 'BUSINESS_STATUS_UPDATED', `Admin updated business ${id} status to ${status}`, adminId);

    res.json({ success: true, data: business });
  } catch (error) {
    await logger.error('ADMIN', 'UPDATE_BUSINESS_STATUS_ERROR', 'Failed to update business status', error as Error);
    res.status(500).json({ success: false, error: 'Failed to update business status' });
  }
});

/**
 * PATCH /admin/businesses/:id/kyb - Update KYB level
 */
router.patch('/businesses/:id/kyb', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { kybLevel, expiresAt, internalNote } = req.body;
    const adminId = req.user!.userId;

    const validLevels = ['NONE', 'BASIC', 'STANDARD', 'ENHANCED'];
    if (!validLevels.includes(kybLevel)) {
      res.status(400).json({ success: false, error: 'Invalid KYB level' });
      return;
    }

    const business = await prisma.business.update({
      where: { id },
      data: {
        kybLevel,
        kybVerifiedAt: kybLevel !== 'NONE' ? new Date() : null,
        kybExpiresAt: expiresAt ? new Date(expiresAt) : null,
        kybProvider: adminId,
      },
    });

    // Trigger trust score event
    await trustScoreService.onKYBVerified(id, kybLevel);

    if (internalNote) {
      await prisma.adminNote.create({
        data: {
          authorId: adminId,
          businessId: id,
          note: internalNote,
          isInternal: true,
        },
      });
    }

    await logger.audit('ADMIN', 'KYB_UPDATED', `Admin updated KYB for business ${id} to ${kybLevel}`, adminId);

    res.json({ success: true, data: business });
  } catch (error) {
    await logger.error('ADMIN', 'UPDATE_KYB_ERROR', 'Failed to update KYB', error as Error);
    res.status(500).json({ success: false, error: 'Failed to update KYB' });
  }
});

// =============================================================================
// CONTACT MESSAGES ADMIN
// =============================================================================

/**
 * GET /admin/contact-messages - List contact messages
 */
router.get('/contact-messages', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where: any = {};
    if (status) {
      where.status = status as MessageStatus;
    }

    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        include: {
          user: {
            select: { email: true, displayName: true },
          },
          adminNotes: {
            include: { author: { select: { displayName: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.contactMessage.count({ where }),
    ]);

    res.json({
      success: true,
      data: messages,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    await logger.error('ADMIN', 'LIST_MESSAGES_ERROR', 'Failed to list messages', error as Error);
    res.status(500).json({ success: false, error: 'Failed to list messages' });
  }
});

/**
 * PATCH /admin/contact-messages/:id - Update contact message
 */
router.patch('/contact-messages/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, responseText, internalNote } = req.body;
    const adminId = req.user!.userId;

    const message = await prisma.contactMessage.update({
      where: { id },
      data: {
        status: status as MessageStatus,
        assignedTo: adminId,
        responseText,
        respondedAt: responseText ? new Date() : undefined,
      },
    });

    if (internalNote) {
      await prisma.adminNote.create({
        data: {
          authorId: adminId,
          contactId: id,
          note: internalNote,
          isInternal: true,
        },
      });
    }

    await logger.audit('ADMIN', 'MESSAGE_UPDATED', `Admin updated contact message ${id}`, adminId);

    res.json({ success: true, data: message });
  } catch (error) {
    await logger.error('ADMIN', 'UPDATE_MESSAGE_ERROR', 'Failed to update message', error as Error);
    res.status(500).json({ success: false, error: 'Failed to update message' });
  }
});

// =============================================================================
// APPLICATIONS ADMIN
// =============================================================================

/**
 * GET /admin/applications - List launch applications
 */
router.get('/applications', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    const where: any = {};
    if (status) where.status = status as ApplicationStatus;
    if (type) where.type = type;

    const [applications, total] = await Promise.all([
      prisma.launchApplication.findMany({
        where,
        include: {
          user: {
            select: { email: true, displayName: true },
          },
          adminNotes: {
            include: { author: { select: { displayName: true, email: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.launchApplication.count({ where }),
    ]);

    res.json({
      success: true,
      data: applications,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    await logger.error('ADMIN', 'LIST_APPLICATIONS_ERROR', 'Failed to list applications', error as Error);
    res.status(500).json({ success: false, error: 'Failed to list applications' });
  }
});

/**
 * PATCH /admin/applications/:id - Update application
 */
router.patch('/applications/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, internalNote } = req.body;
    const adminId = req.user!.userId;

    const application = await prisma.launchApplication.update({
      where: { id },
      data: {
        status: status as ApplicationStatus,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      },
    });

    if (internalNote) {
      await prisma.adminNote.create({
        data: {
          authorId: adminId,
          applicationId: id,
          note: internalNote,
          isInternal: true,
        },
      });
    }

    await logger.audit('ADMIN', 'APPLICATION_UPDATED', `Admin updated application ${id} to ${status}`, adminId);

    res.json({ success: true, data: application });
  } catch (error) {
    await logger.error('ADMIN', 'UPDATE_APPLICATION_ERROR', 'Failed to update application', error as Error);
    res.status(500).json({ success: false, error: 'Failed to update application' });
  }
});

// =============================================================================
// TRUST SCORE ADMIN
// =============================================================================

/**
 * POST /admin/trust-score/adjust - Manual trust score adjustment
 */
router.post('/trust-score/adjust', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const adjustment: TrustScoreAdjustment = req.body;
    const adminId = req.user!.userId;

    if (!adjustment.entityId || !adjustment.entityType || adjustment.points === undefined || !adjustment.reason) {
      res.status(400).json({
        success: false,
        error: 'entityId, entityType, points, and reason are required',
      });
      return;
    }

    const result = await trustScoreService.adminAdjust(adjustment, adminId);

    res.json({ success: true, data: result });
  } catch (error) {
    await logger.error('ADMIN', 'TRUST_SCORE_ADJUST_ERROR', 'Failed to adjust trust score', error as Error);
    res.status(500).json({ success: false, error: 'Failed to adjust trust score' });
  }
});

// =============================================================================
// BLOCKED ENTITIES (SUPER ADMIN ONLY)
// =============================================================================

router.use('/blocked', requireSuperAdmin);

/**
 * GET /admin/blocked - List blocked entities
 */
router.get('/blocked', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const blocked = await prisma.blockedEntity.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: blocked });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to list blocked entities' });
  }
});

/**
 * POST /admin/blocked - Block an entity
 */
router.post('/blocked', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { type, value, reason, expiresAt } = req.body;
    const adminId = req.user!.userId;

    const blocked = await prisma.blockedEntity.create({
      data: {
        type,
        value,
        reason,
        blockedBy: adminId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    await logger.security('ENTITY_BLOCKED', `Admin blocked ${type}: ${value}`, adminId);

    res.status(201).json({ success: true, data: blocked });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to block entity' });
  }
});

/**
 * DELETE /admin/blocked/:id - Unblock an entity
 */
router.delete('/blocked/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user!.userId;

    await prisma.blockedEntity.update({
      where: { id },
      data: { isActive: false },
    });

    await logger.security('ENTITY_UNBLOCKED', `Admin unblocked entity ${id}`, adminId);

    res.json({ success: true, message: 'Entity unblocked' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to unblock entity' });
  }
});

// =============================================================================
// SYSTEM LOGS (SUPER ADMIN ONLY)
// =============================================================================

router.use('/logs', requireSuperAdmin);

/**
 * GET /admin/logs - Get system logs
 */
router.get('/logs', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { level, category, userId, page = 1, limit = 50 } = req.query;

    const where: any = {};
    if (level) where.level = level;
    if (category) where.category = category;
    if (userId) where.userId = userId;

    const logs = await prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get logs' });
  }
});

/**
 * GET /admin/security-events - Get security events
 */
router.get('/security-events', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { severity, page = 1, limit = 50 } = req.query;

    const where: any = {};
    if (severity) where.severity = severity;

    const events = await prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get security events' });
  }
});

export default router;
