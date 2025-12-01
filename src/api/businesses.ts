// =============================================================================
// MARK BACKEND - BUSINESSES API ROUTES
// =============================================================================

import { Router, Response } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, requireBusinessOwnership } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/security';
import { trustScoreService } from '../services/TrustScoreService';
import { encrypt } from '../utils/security';
import { AuthenticatedRequest, CreateBusinessInput, UpdateBusinessInput, FounderInput } from '../types';
import { logger } from '../utils/logger';
import { BusinessStatus } from '@prisma/client';

const router = Router();

// =============================================================================
// POST /businesses - Create a new business
// =============================================================================

router.post(
  '/',
  authenticate,
  apiRateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const input: CreateBusinessInput = req.body;
      const userId = req.user!.userId;

      if (!input.legalName) {
        res.status(400).json({
          success: false,
          error: 'Legal name is required',
        });
        return;
      }

      // Encrypt sensitive data (EIN)
      const encryptedEin = input.ein ? encrypt(input.ein) : null;

      const business = await prisma.business.create({
        data: {
          userId,
          legalName: input.legalName,
          dba: input.dba,
          entityType: input.entityType,
          jurisdiction: input.jurisdiction,
          ein: encryptedEin,
          registrationNumber: input.registrationNumber,
          incorporationDate: input.incorporationDate,
          address: input.address,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country,
          businessEmail: input.businessEmail,
          businessPhone: input.businessPhone,
          website: input.website,
          description: input.description,
          industry: input.industry,
          employeeCount: input.employeeCount,
          annualRevenue: input.annualRevenue,
          linkedin: input.linkedin,
          twitter: input.twitter,
          tokenType: input.tokenType as any,
          raiseAmount: input.raiseAmount,
          equityPercent: input.equityPercent,
          revenueSharePercent: input.revenueSharePercent,
          minInvestment: input.minInvestment,
          maxInvestment: input.maxInvestment,
          status: 'DRAFT',
        },
        include: {
          founders: true,
          documents: true,
        },
      });

      await logger.audit('BUSINESS', 'BUSINESS_CREATED', `Created business ${business.id}: ${business.legalName}`, userId);

      res.status(201).json({
        success: true,
        data: business,
      });
    } catch (error) {
      await logger.error('BUSINESS', 'CREATE_ERROR', 'Failed to create business', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to create business',
      });
    }
  }
);

// =============================================================================
// GET /businesses/mine - Get current user's businesses
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
        where.status = status as BusinessStatus;
      }

      const [businesses, total] = await Promise.all([
        prisma.business.findMany({
          where,
          include: {
            founders: true,
            documents: {
              where: { isPublic: true },
            },
            _count: {
              select: { trustScoreEvents: true, revenueReports: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        prisma.business.count({ where }),
      ]);

      // Mask EIN in response
      const maskedBusinesses = businesses.map(b => ({
        ...b,
        ein: b.ein ? '***-**-' + b.ein.slice(-4) : null,
      }));

      res.json({
        success: true,
        data: maskedBusinesses,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      await logger.error('BUSINESS', 'LIST_ERROR', 'Failed to list businesses', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to list businesses',
      });
    }
  }
);

// =============================================================================
// GET /businesses/:id - Get a specific business
// =============================================================================

router.get(
  '/:id',
  authenticate,
  requireBusinessOwnership,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const business = await prisma.business.findUnique({
        where: { id },
        include: {
          founders: true,
          documents: true,
          revenueReports: {
            orderBy: { periodStart: 'desc' },
            take: 4,
          },
          trustScoreEvents: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          adminNotes: req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN'
            ? { include: { author: { select: { displayName: true, email: true } } } }
            : false,
        },
      });

      if (!business) {
        res.status(404).json({
          success: false,
          error: 'Business not found',
        });
        return;
      }

      // Mask EIN unless admin
      const maskedBusiness = {
        ...business,
        ein: req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN'
          ? business.ein
          : business.ein ? '***-**-' + business.ein.slice(-4) : null,
      };

      res.json({
        success: true,
        data: maskedBusiness,
      });
    } catch (error) {
      await logger.error('BUSINESS', 'GET_ERROR', 'Failed to get business', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business',
      });
    }
  }
);

// =============================================================================
// PATCH /businesses/:id - Update a business
// =============================================================================

router.patch(
  '/:id',
  authenticate,
  requireBusinessOwnership,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const input: UpdateBusinessInput = req.body;
      const userId = req.user!.userId;

      const existing = await prisma.business.findUnique({
        where: { id },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Business not found',
        });
        return;
      }

      // Cannot edit if already live (unless admin)
      if (existing.status === 'LIVE' && req.user?.role === 'USER') {
        res.status(400).json({
          success: false,
          error: 'Cannot edit a live business',
        });
        return;
      }

      // Encrypt EIN if provided
      const encryptedEin = input.ein ? encrypt(input.ein) : undefined;

      const business = await prisma.business.update({
        where: { id },
        data: {
          legalName: input.legalName,
          dba: input.dba,
          entityType: input.entityType,
          jurisdiction: input.jurisdiction,
          ein: encryptedEin,
          registrationNumber: input.registrationNumber,
          incorporationDate: input.incorporationDate,
          address: input.address,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country,
          businessEmail: input.businessEmail,
          businessPhone: input.businessPhone,
          website: input.website,
          description: input.description,
          industry: input.industry,
          employeeCount: input.employeeCount,
          annualRevenue: input.annualRevenue,
          linkedin: input.linkedin,
          twitter: input.twitter,
          tokenType: input.tokenType as any,
          raiseAmount: input.raiseAmount,
          equityPercent: input.equityPercent,
          revenueSharePercent: input.revenueSharePercent,
          minInvestment: input.minInvestment,
          maxInvestment: input.maxInvestment,
          isPaused: input.isPaused,
        },
        include: {
          founders: true,
          documents: true,
        },
      });

      // Recalculate trust score
      await trustScoreService.calculateBusinessScore(id);

      await logger.audit('BUSINESS', 'BUSINESS_UPDATED', `Updated business ${id}`, userId);

      res.json({
        success: true,
        data: {
          ...business,
          ein: business.ein ? '***-**-' + business.ein.slice(-4) : null,
        },
      });
    } catch (error) {
      await logger.error('BUSINESS', 'UPDATE_ERROR', 'Failed to update business', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to update business',
      });
    }
  }
);

// =============================================================================
// POST /businesses/:id/founders - Add a founder
// =============================================================================

router.post(
  '/:id/founders',
  authenticate,
  requireBusinessOwnership,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const input: FounderInput = req.body;
      const userId = req.user!.userId;

      if (!input.name || !input.role) {
        res.status(400).json({
          success: false,
          error: 'Founder name and role are required',
        });
        return;
      }

      const founder = await prisma.businessFounder.create({
        data: {
          businessId: id,
          name: input.name,
          role: input.role,
          email: input.email,
          ownershipPercent: input.ownershipPercent,
          walletAddress: input.walletAddress,
          linkedinUrl: input.linkedinUrl,
        },
      });

      await logger.audit('BUSINESS', 'FOUNDER_ADDED', `Added founder to business ${id}`, userId);

      res.status(201).json({
        success: true,
        data: founder,
      });
    } catch (error) {
      await logger.error('BUSINESS', 'ADD_FOUNDER_ERROR', 'Failed to add founder', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to add founder',
      });
    }
  }
);

// =============================================================================
// POST /businesses/:id/submit - Submit for review
// =============================================================================

router.post(
  '/:id/submit',
  authenticate,
  requireBusinessOwnership,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const existing = await prisma.business.findUnique({
        where: { id },
        include: { founders: true, documents: true },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Business not found',
        });
        return;
      }

      if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
        res.status(400).json({
          success: false,
          error: 'Business can only be submitted from DRAFT or REJECTED status',
        });
        return;
      }

      // Validate required fields
      const requiredFields = ['legalName', 'entityType', 'jurisdiction', 'description'];
      const missingFields = requiredFields.filter(field => !existing[field as keyof typeof existing]);

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
        });
        return;
      }

      // Check for at least one founder
      if (existing.founders.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one founder is required',
        });
        return;
      }

      const business = await prisma.business.update({
        where: { id },
        data: {
          status: 'PENDING_REVIEW',
          submittedAt: new Date(),
          rejectionReason: null,
        },
      });

      // Calculate initial trust score
      await trustScoreService.calculateBusinessScore(id);

      await logger.audit('BUSINESS', 'BUSINESS_SUBMITTED', `Business ${id} submitted for review`, userId);

      res.json({
        success: true,
        data: business,
        message: 'Business submitted for review',
      });
    } catch (error) {
      await logger.error('BUSINESS', 'SUBMIT_ERROR', 'Failed to submit business', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit business',
      });
    }
  }
);

export default router;
