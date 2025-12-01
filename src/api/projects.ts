// =============================================================================
// MARK BACKEND - CRYPTO PROJECTS API ROUTES
// =============================================================================

import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, requireProjectOwnership } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/security';
import { trustScoreService } from '../services/TrustScoreService';
import { AuthenticatedRequest, CreateProjectInput, UpdateProjectInput } from '../types';
import { logger } from '../utils/logger';
import { ProjectStatus } from '@prisma/client';

const router = Router();

// =============================================================================
// POST /projects - Create a new project
// =============================================================================

router.post(
  '/',
  authenticate,
  apiRateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const input: CreateProjectInput = req.body;
      const userId = req.user!.userId;

      if (!input.name) {
        res.status(400).json({
          success: false,
          error: 'Project name is required',
        });
        return;
      }

      const project = await prisma.cryptoProject.create({
        data: {
          userId,
          name: input.name,
          symbol: input.symbol,
          description: input.description,
          category: input.category,
          website: input.website,
          whitepaper: input.whitepaper,
          twitter: input.twitter,
          discord: input.discord,
          telegram: input.telegram,
          github: input.github,
          tokenType: input.tokenType as any || 'UTILITY',
          totalSupply: input.totalSupply,
          decimals: input.decimals || 18,
          teamAllocationPercent: input.teamAllocationPercent,
          teamVestingMonths: input.teamVestingMonths,
          teamCliffMonths: input.teamCliffMonths,
          vestingType: input.vestingType as any,
          initialLiquidity: input.initialLiquidity,
          liquidityLockMonths: input.liquidityLockMonths,
          auditProvider: input.auditProvider,
          auditReportUrl: input.auditReportUrl,
          launchDate: input.launchDate,
          softCap: input.softCap,
          hardCap: input.hardCap,
          minContribution: input.minContribution,
          maxContribution: input.maxContribution,
          status: 'DRAFT',
        },
        include: {
          documents: true,
        },
      });

      await logger.audit('PROJECT', 'PROJECT_CREATED', `Created project ${project.id}: ${project.name}`, userId);

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (error) {
      await logger.error('PROJECT', 'CREATE_ERROR', 'Failed to create project', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to create project',
      });
    }
  }
);

// =============================================================================
// GET /projects/mine - Get current user's projects
// =============================================================================

router.get(
  '/mine',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { status, page = 1, limit = 20 } = req.query;

      const where: any = { userId };
      if (status) {
        where.status = status as ProjectStatus;
      }

      const [projects, total] = await Promise.all([
        prisma.cryptoProject.findMany({
          where,
          include: {
            documents: true,
            _count: {
              select: { trustScoreEvents: true },
            },
          },
          orderBy: { createdAt: 'desc' },
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
      await logger.error('PROJECT', 'LIST_ERROR', 'Failed to list projects', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to list projects',
      });
    }
  }
);

// =============================================================================
// GET /projects/:id - Get a specific project
// =============================================================================

router.get(
  '/:id',
  authenticate,
  requireProjectOwnership,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const project = await prisma.cryptoProject.findUnique({
        where: { id },
        include: {
          documents: true,
          trustScoreEvents: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          adminNotes: req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN'
            ? { include: { author: { select: { displayName: true, email: true } } } }
            : false,
        },
      });

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      await logger.error('PROJECT', 'GET_ERROR', 'Failed to get project', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get project',
      });
    }
  }
);

// =============================================================================
// PATCH /projects/:id - Update a project
// =============================================================================

router.patch(
  '/:id',
  authenticate,
  requireProjectOwnership,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const input: UpdateProjectInput = req.body;
      const userId = req.user!.userId;

      // Get current project
      const existing = await prisma.cryptoProject.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      // Cannot edit if already live (unless admin)
      if (existing.status === 'LIVE' && req.user?.role === 'USER') {
        res.status(400).json({
          success: false,
          error: 'Cannot edit a live project',
        });
        return;
      }

      // Update project
      const project = await prisma.cryptoProject.update({
        where: { id },
        data: {
          name: input.name,
          symbol: input.symbol,
          description: input.description,
          category: input.category,
          website: input.website,
          whitepaper: input.whitepaper,
          twitter: input.twitter,
          discord: input.discord,
          telegram: input.telegram,
          github: input.github,
          tokenType: input.tokenType as any,
          totalSupply: input.totalSupply,
          decimals: input.decimals,
          teamAllocationPercent: input.teamAllocationPercent,
          teamVestingMonths: input.teamVestingMonths,
          teamCliffMonths: input.teamCliffMonths,
          vestingType: input.vestingType as any,
          initialLiquidity: input.initialLiquidity,
          liquidityLockMonths: input.liquidityLockMonths,
          auditProvider: input.auditProvider,
          auditReportUrl: input.auditReportUrl,
          launchDate: input.launchDate,
          softCap: input.softCap,
          hardCap: input.hardCap,
          minContribution: input.minContribution,
          maxContribution: input.maxContribution,
          isPaused: input.isPaused,
        },
        include: {
          documents: true,
        },
      });

      // Recalculate trust score if relevant fields changed
      if (input.teamVestingMonths || input.liquidityLockMonths || input.auditProvider) {
        await trustScoreService.calculateProjectScore(id);
      }

      await logger.audit('PROJECT', 'PROJECT_UPDATED', `Updated project ${id}`, userId);

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      await logger.error('PROJECT', 'UPDATE_ERROR', 'Failed to update project', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to update project',
      });
    }
  }
);

// =============================================================================
// POST /projects/:id/submit - Submit for review
// =============================================================================

router.post(
  '/:id/submit',
  authenticate,
  requireProjectOwnership,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const existing = await prisma.cryptoProject.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
        res.status(400).json({
          success: false,
          error: 'Project can only be submitted from DRAFT or REJECTED status',
        });
        return;
      }

      // Validate required fields for submission
      const requiredFields = ['name', 'description', 'category', 'totalSupply'];
      const missingFields = requiredFields.filter(field => !existing[field as keyof typeof existing]);

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        });
        return;
      }

      const project = await prisma.cryptoProject.update({
        where: { id },
        data: {
          status: 'PENDING_REVIEW',
          submittedAt: new Date(),
          rejectionReason: null,
        },
      });

      // Calculate initial trust score
      await trustScoreService.calculateProjectScore(id);

      await logger.audit('PROJECT', 'PROJECT_SUBMITTED', `Project ${id} submitted for review`, userId);

      res.json({
        success: true,
        data: project,
        message: 'Project submitted for review',
      });
    } catch (error) {
      await logger.error('PROJECT', 'SUBMIT_ERROR', 'Failed to submit project', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit project',
      });
    }
  }
);

// =============================================================================
// DELETE /projects/:id - Delete a draft project
// =============================================================================

router.delete(
  '/:id',
  authenticate,
  requireProjectOwnership,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const existing = await prisma.cryptoProject.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      // Can only delete drafts
      if (existing.status !== 'DRAFT') {
        res.status(400).json({
          success: false,
          error: 'Can only delete draft projects',
        });
        return;
      }

      await prisma.cryptoProject.delete({
        where: { id },
      });

      await logger.audit('PROJECT', 'PROJECT_DELETED', `Deleted project ${id}`, userId);

      res.json({
        success: true,
        message: 'Project deleted',
      });
    } catch (error) {
      await logger.error('PROJECT', 'DELETE_ERROR', 'Failed to delete project', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete project',
      });
    }
  }
);

export default router;
