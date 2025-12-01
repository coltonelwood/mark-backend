// =============================================================================
// MARK BACKEND - TRUST SCORE API ROUTES
// =============================================================================

import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { trustScoreService } from '../services/TrustScoreService';
import { optionalAuth, authenticate, requireProjectOwnership, requireBusinessOwnership } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/security';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// =============================================================================
// GET /trust-score/projects/:id - Get project trust score
// =============================================================================

router.get(
  '/projects/:id',
  apiRateLimiter,
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Check if project exists and is public (or user is owner/admin)
      const project = await prisma.cryptoProject.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          status: true,
          name: true,
          symbol: true,
          isVerified: true,
        },
      });

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      // Only show trust score for public/live projects, or to owner/admin
      const isOwner = req.user?.userId === project.userId;
      const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
      const isPublic = project.status === 'LIVE' || project.status === 'APPROVED';

      if (!isPublic && !isOwner && !isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Trust score not available for this project',
        });
        return;
      }

      const trustScore = await trustScoreService.getProjectScore(id);

      // Add tier info
      const tierInfo = trustScoreService.getTierInfo(trustScore.currentScore);

      res.json({
        success: true,
        data: {
          ...trustScore,
          tierDescription: tierInfo.description,
          project: {
            id: project.id,
            name: project.name,
            symbol: project.symbol,
            isVerified: project.isVerified,
          },
        },
      });
    } catch (error) {
      await logger.error('TRUST_SCORE', 'GET_PROJECT_SCORE_ERROR', 'Failed to get project trust score', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trust score',
      });
    }
  }
);

// =============================================================================
// GET /trust-score/businesses/:id - Get business trust score
// =============================================================================

router.get(
  '/businesses/:id',
  apiRateLimiter,
  optionalAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Check if business exists
      const business = await prisma.business.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          status: true,
          legalName: true,
          dba: true,
          kybLevel: true,
          isVerified: true,
        },
      });

      if (!business) {
        res.status(404).json({
          success: false,
          error: 'Business not found',
        });
        return;
      }

      // Only show trust score for public/live businesses, or to owner/admin
      const isOwner = req.user?.userId === business.userId;
      const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
      const isPublic = business.status === 'LIVE' || business.status === 'APPROVED';

      if (!isPublic && !isOwner && !isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Trust score not available for this business',
        });
        return;
      }

      const trustScore = await trustScoreService.getBusinessScore(id);

      // Add tier info
      const tierInfo = trustScoreService.getTierInfo(trustScore.currentScore);

      res.json({
        success: true,
        data: {
          ...trustScore,
          tierDescription: tierInfo.description,
          business: {
            id: business.id,
            legalName: business.legalName,
            dba: business.dba,
            kybLevel: business.kybLevel,
            isVerified: business.isVerified,
          },
        },
      });
    } catch (error) {
      await logger.error('TRUST_SCORE', 'GET_BUSINESS_SCORE_ERROR', 'Failed to get business trust score', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trust score',
      });
    }
  }
);

// =============================================================================
// GET /trust-score/tiers - Get trust score tier information
// =============================================================================

router.get(
  '/tiers',
  apiRateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tiers = [
        { tier: 'EXCELLENT', minScore: 85, maxScore: 100, color: 'green', description: 'Highly Trusted - Exceptional trustworthiness' },
        { tier: 'GOOD', minScore: 70, maxScore: 84, color: 'blue', description: 'Trusted - Meets high standards' },
        { tier: 'NEUTRAL', minScore: 50, maxScore: 69, color: 'gray', description: 'Standard - Meets basic requirements' },
        { tier: 'CAUTION', minScore: 30, maxScore: 49, color: 'yellow', description: 'Exercise Caution - Some factors missing' },
        { tier: 'HIGH_RISK', minScore: 0, maxScore: 29, color: 'red', description: 'High Risk - Significant factors missing' },
      ];

      res.json({
        success: true,
        data: tiers,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get tier information',
      });
    }
  }
);

// =============================================================================
// GET /trust-score/projects/:id/history - Get project score history
// =============================================================================

router.get(
  '/projects/:id/history',
  authenticate,
  requireProjectOwnership,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const [events, total] = await Promise.all([
        prisma.trustScoreEvent.findMany({
          where: { projectId: id },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        prisma.trustScoreEvent.count({ where: { projectId: id } }),
      ]);

      res.json({
        success: true,
        data: events,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      await logger.error('TRUST_SCORE', 'GET_PROJECT_HISTORY_ERROR', 'Failed to get score history', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get score history',
      });
    }
  }
);

// =============================================================================
// GET /trust-score/businesses/:id/history - Get business score history
// =============================================================================

router.get(
  '/businesses/:id/history',
  authenticate,
  requireBusinessOwnership,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const [events, total] = await Promise.all([
        prisma.trustScoreEvent.findMany({
          where: { businessId: id },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        prisma.trustScoreEvent.count({ where: { businessId: id } }),
      ]);

      res.json({
        success: true,
        data: events,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      await logger.error('TRUST_SCORE', 'GET_BUSINESS_HISTORY_ERROR', 'Failed to get score history', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get score history',
      });
    }
  }
);

export default router;
