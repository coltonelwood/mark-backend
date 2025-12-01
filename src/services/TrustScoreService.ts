// =============================================================================
// MARK BACKEND - TRUST SCORE ENGINE
// =============================================================================
// Modular, rule-based trust scoring system for crypto projects and businesses
// =============================================================================

import { prisma } from '../utils/prisma';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  TrustScoreResult,
  TrustScoreFactor,
  TrustScoreTier,
  TrustScoreAdjustment,
} from '../types';
import {
  TrustScoreEventType,
  CryptoProject,
  Business,
  PrivateIdentityVerification,
} from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

interface ScoreRule {
  name: string;
  maxPoints: number;
  description: string;
  evaluate: (entity: CryptoProject | Business, context: EvaluationContext) => number;
}

interface EvaluationContext {
  identity?: PrivateIdentityVerification | null;
  documentsCount?: number;
  hasFinancialDocs?: boolean;
  hasAuditDocs?: boolean;
  founderCount?: number;
  founderKycCount?: number;
}

// =============================================================================
// SCORE TIERS
// =============================================================================

function getTier(score: number): TrustScoreTier {
  if (score >= 85) return 'EXCELLENT';
  if (score >= 70) return 'GOOD';
  if (score >= 50) return 'NEUTRAL';
  if (score >= 30) return 'CAUTION';
  return 'HIGH_RISK';
}

function getTierDescription(tier: TrustScoreTier): string {
  const descriptions: Record<TrustScoreTier, string> = {
    EXCELLENT: 'Highly Trusted - This entity has demonstrated exceptional trustworthiness',
    GOOD: 'Trusted - This entity meets high standards of verification and transparency',
    NEUTRAL: 'Standard - This entity meets basic requirements',
    CAUTION: 'Exercise Caution - Some trust factors are missing or concerning',
    HIGH_RISK: 'High Risk - Significant trust factors are missing or concerning',
  };
  return descriptions[tier];
}

// =============================================================================
// CRYPTO PROJECT RULES
// =============================================================================

const cryptoRules: ScoreRule[] = [
  {
    name: 'Identity Verification',
    maxPoints: config.trustScore.crypto.identityVerified,
    description: 'Team lead has completed private identity verification',
    evaluate: (entity, context) => {
      if (context.identity?.status === 'VERIFIED') {
        return config.trustScore.crypto.identityVerified;
      }
      return 0;
    },
  },
  {
    name: 'Liquidity Lock (6+ months)',
    maxPoints: config.trustScore.crypto.liquidityLock6Months,
    description: 'Initial liquidity is locked for at least 6 months',
    evaluate: (entity) => {
      const project = entity as CryptoProject;
      if (project.liquidityLockMonths && project.liquidityLockMonths >= 6) {
        return config.trustScore.crypto.liquidityLock6Months;
      }
      return 0;
    },
  },
  {
    name: 'Liquidity Lock (12+ months)',
    maxPoints: config.trustScore.crypto.liquidityLock12Months - config.trustScore.crypto.liquidityLock6Months,
    description: 'Initial liquidity is locked for at least 12 months (additional bonus)',
    evaluate: (entity) => {
      const project = entity as CryptoProject;
      if (project.liquidityLockMonths && project.liquidityLockMonths >= 12) {
        return config.trustScore.crypto.liquidityLock12Months - config.trustScore.crypto.liquidityLock6Months;
      }
      return 0;
    },
  },
  {
    name: 'Team Vesting (12+ months)',
    maxPoints: config.trustScore.crypto.vesting12Months,
    description: 'Team tokens have at least 12 months vesting',
    evaluate: (entity) => {
      const project = entity as CryptoProject;
      if (project.teamVestingMonths && project.teamVestingMonths >= 12) {
        return config.trustScore.crypto.vesting12Months;
      }
      return 0;
    },
  },
  {
    name: 'Team Vesting (24+ months)',
    maxPoints: config.trustScore.crypto.vesting24Months - config.trustScore.crypto.vesting12Months,
    description: 'Team tokens have at least 24 months vesting (additional bonus)',
    evaluate: (entity) => {
      const project = entity as CryptoProject;
      if (project.teamVestingMonths && project.teamVestingMonths >= 24) {
        return config.trustScore.crypto.vesting24Months - config.trustScore.crypto.vesting12Months;
      }
      return 0;
    },
  },
  {
    name: 'Complete Profile',
    maxPoints: config.trustScore.crypto.profileComplete,
    description: 'Project has a complete profile with all essential information',
    evaluate: (entity) => {
      const project = entity as CryptoProject;
      const requiredFields = [
        project.name,
        project.description,
        project.category,
        project.totalSupply,
        project.teamAllocationPercent !== null,
      ];
      const completeness = requiredFields.filter(Boolean).length / requiredFields.length;
      return Math.floor(completeness * config.trustScore.crypto.profileComplete);
    },
  },
  {
    name: 'External Audit',
    maxPoints: config.trustScore.crypto.externalAudit,
    description: 'Smart contract has been audited by a third-party',
    evaluate: (entity) => {
      const project = entity as CryptoProject;
      if (project.auditProvider && project.auditReportUrl) {
        return config.trustScore.crypto.externalAudit;
      }
      return 0;
    },
  },
  {
    name: 'Whitepaper & Socials',
    maxPoints: config.trustScore.crypto.whitepaperSocials,
    description: 'Project has whitepaper and active social media presence',
    evaluate: (entity) => {
      const project = entity as CryptoProject;
      let points = 0;
      if (project.whitepaper) points += 2;
      if (project.twitter || project.discord || project.telegram) points += 3;
      return Math.min(points, config.trustScore.crypto.whitepaperSocials);
    },
  },
  {
    name: 'Contract Verified',
    maxPoints: config.trustScore.crypto.contractVerified,
    description: 'Smart contract source code is verified on-chain',
    evaluate: (entity) => {
      const project = entity as CryptoProject;
      if (project.contractVerified) {
        return config.trustScore.crypto.contractVerified;
      }
      return 0;
    },
  },
];

// =============================================================================
// BUSINESS RULES
// =============================================================================

const businessRules: ScoreRule[] = [
  {
    name: 'KYB Basic',
    maxPoints: config.trustScore.business.kybBasic,
    description: 'Business has completed basic KYB verification',
    evaluate: (entity) => {
      const business = entity as Business;
      if (business.kybLevel === 'BASIC' || business.kybLevel === 'STANDARD' || business.kybLevel === 'ENHANCED') {
        return config.trustScore.business.kybBasic;
      }
      return 0;
    },
  },
  {
    name: 'KYB Standard',
    maxPoints: config.trustScore.business.kybStandard - config.trustScore.business.kybBasic,
    description: 'Business has completed standard KYB verification (additional)',
    evaluate: (entity) => {
      const business = entity as Business;
      if (business.kybLevel === 'STANDARD' || business.kybLevel === 'ENHANCED') {
        return config.trustScore.business.kybStandard - config.trustScore.business.kybBasic;
      }
      return 0;
    },
  },
  {
    name: 'KYB Enhanced',
    maxPoints: config.trustScore.business.kybEnhanced - config.trustScore.business.kybStandard,
    description: 'Business has completed enhanced KYB verification (additional)',
    evaluate: (entity) => {
      const business = entity as Business;
      if (business.kybLevel === 'ENHANCED') {
        return config.trustScore.business.kybEnhanced - config.trustScore.business.kybStandard;
      }
      return 0;
    },
  },
  {
    name: 'Financial Documents',
    maxPoints: config.trustScore.business.financialDocs,
    description: 'Business has uploaded financial documents (P&L, balance sheet)',
    evaluate: (entity, context) => {
      if (context.hasFinancialDocs) {
        return config.trustScore.business.financialDocs;
      }
      return 0;
    },
  },
  {
    name: 'EIN / Registration',
    maxPoints: config.trustScore.business.einRegistration,
    description: 'Business has valid EIN or registration number on file',
    evaluate: (entity) => {
      const business = entity as Business;
      if (business.ein || business.registrationNumber) {
        return config.trustScore.business.einRegistration;
      }
      return 0;
    },
  },
  {
    name: 'Complete Profile',
    maxPoints: config.trustScore.business.profileComplete,
    description: 'Business has a complete profile with all essential information',
    evaluate: (entity) => {
      const business = entity as Business;
      const requiredFields = [
        business.legalName,
        business.entityType,
        business.jurisdiction,
        business.description,
        business.industry,
        business.businessEmail,
        business.website,
      ];
      const completeness = requiredFields.filter(Boolean).length / requiredFields.length;
      return Math.floor(completeness * config.trustScore.business.profileComplete);
    },
  },
  {
    name: 'External Accounting Review',
    maxPoints: config.trustScore.business.externalAccountingReview,
    description: 'Financial documents have been reviewed by external accountant',
    evaluate: (entity, context) => {
      if (context.hasAuditDocs) {
        return config.trustScore.business.externalAccountingReview;
      }
      return 0;
    },
  },
];

// =============================================================================
// TRUST SCORE SERVICE
// =============================================================================

class TrustScoreService {
  // ===========================================================================
  // CALCULATE SCORE
  // ===========================================================================

  /**
   * Calculate trust score for a crypto project
   */
  async calculateProjectScore(projectId: string): Promise<TrustScoreResult> {
    const project = await prisma.cryptoProject.findUnique({
      where: { id: projectId },
      include: {
        user: {
          include: {
            identityVerification: true,
          },
        },
        documents: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const context: EvaluationContext = {
      identity: project.user.identityVerification,
      documentsCount: project.documents.length,
      hasAuditDocs: project.documents.some((d) => d.type === 'audit'),
    };

    const factors: TrustScoreFactor[] = [];
    let totalScore = config.trustScore.baseScore;

    // Evaluate each rule
    for (const rule of cryptoRules) {
      const points = rule.evaluate(project, context);
      totalScore += points;

      factors.push({
        name: rule.name,
        points,
        maxPoints: rule.maxPoints,
        achieved: points > 0,
        description: rule.description,
      });
    }

    // Apply any penalty events
    const penaltyEvents = await prisma.trustScoreEvent.findMany({
      where: {
        projectId,
        points: { lt: 0 },
      },
    });

    for (const event of penaltyEvents) {
      totalScore += event.points;
    }

    // Clamp score to valid range
    totalScore = Math.max(config.trustScore.minScore, Math.min(config.trustScore.maxScore, totalScore));

    // Get history
    const history = await prisma.trustScoreEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const result: TrustScoreResult = {
      entityId: projectId,
      entityType: 'project',
      currentScore: totalScore,
      tier: getTier(totalScore),
      factors,
      lastUpdated: new Date(),
      history: history.map((h) => ({
        date: h.createdAt,
        score: totalScore, // Would need historical scores for past values
        eventType: h.eventType,
        points: h.points,
        reason: h.reason,
      })),
    };

    // Update the project's trust score
    await prisma.cryptoProject.update({
      where: { id: projectId },
      data: {
        trustScore: totalScore,
        trustScoreUpdatedAt: new Date(),
      },
    });

    await logger.audit('TRUST_SCORE', 'SCORE_CALCULATED', `Calculated trust score for project ${projectId}: ${totalScore}`, project.userId);

    return result;
  }

  /**
   * Calculate trust score for a business
   */
  async calculateBusinessScore(businessId: string): Promise<TrustScoreResult> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        user: {
          include: {
            identityVerification: true,
          },
        },
        documents: true,
        founders: true,
      },
    });

    if (!business) {
      throw new Error('Business not found');
    }

    const context: EvaluationContext = {
      identity: business.user.identityVerification,
      documentsCount: business.documents.length,
      hasFinancialDocs: business.documents.some((d) => d.type === 'financial'),
      hasAuditDocs: business.documents.some((d) => d.type === 'audit' && d.isVerified),
      founderCount: business.founders.length,
      founderKycCount: business.founders.filter((f) => f.kycVerified).length,
    };

    const factors: TrustScoreFactor[] = [];
    let totalScore = config.trustScore.baseScore;

    // Evaluate each rule
    for (const rule of businessRules) {
      const points = rule.evaluate(business, context);
      totalScore += points;

      factors.push({
        name: rule.name,
        points,
        maxPoints: rule.maxPoints,
        achieved: points > 0,
        description: rule.description,
      });
    }

    // Apply any penalty events
    const penaltyEvents = await prisma.trustScoreEvent.findMany({
      where: {
        businessId,
        points: { lt: 0 },
      },
    });

    for (const event of penaltyEvents) {
      totalScore += event.points;
    }

    // Clamp score to valid range
    totalScore = Math.max(config.trustScore.minScore, Math.min(config.trustScore.maxScore, totalScore));

    // Get history
    const history = await prisma.trustScoreEvent.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const result: TrustScoreResult = {
      entityId: businessId,
      entityType: 'business',
      currentScore: totalScore,
      tier: getTier(totalScore),
      factors,
      lastUpdated: new Date(),
      history: history.map((h) => ({
        date: h.createdAt,
        score: totalScore,
        eventType: h.eventType,
        points: h.points,
        reason: h.reason,
      })),
    };

    // Update the business's trust score
    await prisma.business.update({
      where: { id: businessId },
      data: {
        trustScore: totalScore,
        trustScoreUpdatedAt: new Date(),
      },
    });

    await logger.audit('TRUST_SCORE', 'SCORE_CALCULATED', `Calculated trust score for business ${businessId}: ${totalScore}`, business.userId);

    return result;
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  /**
   * Record a trust score event
   */
  async recordEvent(
    entityId: string,
    entityType: 'project' | 'business',
    eventType: TrustScoreEventType,
    points: number,
    reason: string,
    triggeredBy?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await prisma.trustScoreEvent.create({
      data: {
        projectId: entityType === 'project' ? entityId : undefined,
        businessId: entityType === 'business' ? entityId : undefined,
        eventType,
        points,
        reason,
        triggeredBy,
        // key fix here:
        metadata: (metadata ?? undefined) as any,
      },
    });

    // Recalculate score after event
    if (entityType === 'project') {
      await this.calculateProjectScore(entityId);
    } else {
      await this.calculateBusinessScore(entityId);
    }
  }

  /**
   * Admin adjustment of trust score
   */
  async adminAdjust(
    adjustment: TrustScoreAdjustment,
    adminId: string
  ): Promise<TrustScoreResult> {
    await this.recordEvent(
      adjustment.entityId,
      adjustment.entityType,
      'MANUAL_ADJUSTMENT',
      adjustment.points,
      adjustment.reason,
      adminId,
      { adminAdjustment: true }
    );

    await logger.audit(
      'TRUST_SCORE',
      'ADMIN_ADJUSTMENT',
      `Admin ${adminId} adjusted ${adjustment.entityType} ${adjustment.entityId} by ${adjustment.points} points: ${adjustment.reason}`,
      adminId
    );

    if (adjustment.entityType === 'project') {
      return this.calculateProjectScore(adjustment.entityId);
    } else {
      return this.calculateBusinessScore(adjustment.entityId);
    }
  }

  // ===========================================================================
  // TRIGGERS (Called by other services)
  // ===========================================================================

  /**
   * Called when identity is verified
   */
  async onIdentityVerified(userId: string): Promise<void> {
    // Find all projects and businesses for this user
    const projects = await prisma.cryptoProject.findMany({
      where: { userId },
    });

    const businesses = await prisma.business.findMany({
      where: { userId },
    });

    for (const project of projects) {
      await this.recordEvent(
        project.id,
        'project',
        'IDENTITY_VERIFIED',
        config.trustScore.crypto.identityVerified,
        'Team lead completed identity verification',
        'system'
      );
    }

    for (const business of businesses) {
      await this.recordEvent(
        business.id,
        'business',
        'IDENTITY_VERIFIED',
        config.trustScore.business.kybBasic,
        'Business owner completed identity verification',
        'system'
      );
    }
  }

  /**
   * Called when liquidity is locked
   */
  async onLiquidityLocked(projectId: string, months: number): Promise<void> {
    let points = 0;
    if (months >= 12) {
      points = config.trustScore.crypto.liquidityLock12Months;
    } else if (months >= 6) {
      points = config.trustScore.crypto.liquidityLock6Months;
    }

    if (points > 0) {
      await this.recordEvent(
        projectId,
        'project',
        'LIQUIDITY_LOCKED',
        points,
        `Liquidity locked for ${months} months`,
        'system'
      );
    }
  }

  /**
   * Called when vesting is configured
   */
  async onVestingConfigured(projectId: string, months: number): Promise<void> {
    let points = 0;
    if (months >= 24) {
      points = config.trustScore.crypto.vesting24Months;
    } else if (months >= 12) {
      points = config.trustScore.crypto.vesting12Months;
    }

    if (points > 0) {
      await this.recordEvent(
        projectId,
        'project',
        'VESTING_CONFIGURED',
        points,
        `Team vesting configured for ${months} months`,
        'system'
      );
    }
  }

  /**
   * Called when KYB is verified
   */
  async onKYBVerified(businessId: string, level: string): Promise<void> {
    let points = 0;
    if (level === 'ENHANCED') {
      points = config.trustScore.business.kybEnhanced;
    } else if (level === 'STANDARD') {
      points = config.trustScore.business.kybStandard;
    } else if (level === 'BASIC') {
      points = config.trustScore.business.kybBasic;
    }

    if (points > 0) {
      await this.recordEvent(
        businessId,
        'business',
        'KYB_VERIFIED',
        points,
        `KYB ${level} verification completed`,
        'system'
      );
    }
  }

  /**
   * Called when documents are uploaded
   */
  async onDocumentsUploaded(
    entityId: string,
    entityType: 'project' | 'business',
    docType: string
  ): Promise<void> {
    let points = 0;
    let reason = '';

    if (entityType === 'business' && docType === 'financial') {
      points = config.trustScore.business.financialDocs;
      reason = 'Financial documents uploaded';
    } else if (entityType === 'project' && docType === 'audit') {
      points = config.trustScore.crypto.externalAudit;
      reason = 'Audit report uploaded';
    }

    if (points > 0) {
      await this.recordEvent(
        entityId,
        entityType,
        'DOCS_UPLOADED',
        points,
        reason,
        'system'
      );
    }
  }

  // ===========================================================================
  // PENALTIES
  // ===========================================================================

  /**
   * Apply penalty for missed revenue report
   */
  async applyMissedReportPenalty(businessId: string, period: string): Promise<void> {
    await this.recordEvent(
      businessId,
      'business',
      'PENALTY_APPLIED',
      config.trustScore.penalties.missedReport,
      `Missed revenue report for ${period}`,
      'system'
    );
  }

  /**
   * Apply penalty for community report (verified by governance)
   */
  async applyCommunityReportPenalty(
    entityId: string,
    entityType: 'project' | 'business',
    reportReason: string
  ): Promise<void> {
    await this.recordEvent(
      entityId,
      entityType,
      'PENALTY_APPLIED',
      config.trustScore.penalties.communityReport,
      `Community report verified: ${reportReason}`,
      'governance'
    );
  }

  // ===========================================================================
  // QUERIES
  // ===========================================================================

  /**
   * Get trust score for a project
   */
  async getProjectScore(projectId: string): Promise<TrustScoreResult> {
    return this.calculateProjectScore(projectId);
  }

  /**
   * Get trust score for a business
   */
  async getBusinessScore(businessId: string): Promise<TrustScoreResult> {
    return this.calculateBusinessScore(businessId);
  }

  /**
   * Get tier information
   */
  getTierInfo(score: number): { tier: TrustScoreTier; description: string } {
    const tier = getTier(score);
    return {
      tier,
      description: getTierDescription(tier),
    };
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================

export const trustScoreService = new TrustScoreService();
export default trustScoreService;
