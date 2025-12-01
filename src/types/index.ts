// =============================================================================
// MARK BACKEND - TYPE DEFINITIONS
// =============================================================================

import { Request } from 'express';
import { User, UserRole, ProjectStatus, BusinessStatus, KYBLevel } from '@prisma/client';

// =============================================================================
// AUTH TYPES
// =============================================================================

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  walletAddress?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  sessionId?: string;
  requestId?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  walletAddress?: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SafeUser {
  id: string;
  email: string;
  role: UserRole;
  walletAddress: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
}

// =============================================================================
// PROJECT TYPES
// =============================================================================

export interface CreateProjectInput {
  name: string;
  symbol?: string;
  description?: string;
  category?: string;
  website?: string;
  whitepaper?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
  github?: string;
  tokenType?: string;
  totalSupply?: string;
  decimals?: number;
  teamAllocationPercent?: number;
  teamVestingMonths?: number;
  teamCliffMonths?: number;
  vestingType?: string;
  initialLiquidity?: string;
  liquidityLockMonths?: number;
  auditProvider?: string;
  auditReportUrl?: string;
  launchDate?: Date;
  softCap?: string;
  hardCap?: string;
  minContribution?: string;
  maxContribution?: string;
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  status?: ProjectStatus;
  isPaused?: boolean;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  category?: string;
  minTrustScore?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
}

// =============================================================================
// BUSINESS TYPES
// =============================================================================

export interface CreateBusinessInput {
  legalName: string;
  dba?: string;
  entityType?: string;
  jurisdiction?: string;
  ein?: string;
  registrationNumber?: string;
  incorporationDate?: Date;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  businessEmail?: string;
  businessPhone?: string;
  website?: string;
  description?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: string;
  linkedin?: string;
  twitter?: string;
  tokenType?: string;
  raiseAmount?: string;
  equityPercent?: number;
  revenueSharePercent?: number;
  minInvestment?: string;
  maxInvestment?: string;
}

export interface UpdateBusinessInput extends Partial<CreateBusinessInput> {
  status?: BusinessStatus;
  kybLevel?: KYBLevel;
  isPaused?: boolean;
}

export interface BusinessFilters {
  status?: BusinessStatus;
  kybLevel?: KYBLevel;
  industry?: string;
  minTrustScore?: number;
  isVerified?: boolean;
}

export interface FounderInput {
  name: string;
  role: string;
  email?: string;
  ownershipPercent?: number;
  walletAddress?: string;
  linkedinUrl?: string;
}

// =============================================================================
// TRUST SCORE TYPES
// =============================================================================

export interface TrustScoreResult {
  entityId: string;
  entityType: 'project' | 'business';
  currentScore: number;
  tier: TrustScoreTier;
  factors: TrustScoreFactor[];
  lastUpdated: Date;
  history: TrustScoreHistoryItem[];
}

export interface TrustScoreFactor {
  name: string;
  points: number;
  maxPoints: number;
  achieved: boolean;
  description: string;
}

export interface TrustScoreHistoryItem {
  date: Date;
  score: number;
  eventType: string;
  points: number;
  reason: string;
}

export type TrustScoreTier = 'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'CAUTION' | 'HIGH_RISK';

export interface TrustScoreAdjustment {
  entityId: string;
  entityType: 'project' | 'business';
  points: number;
  reason: string;
}

// =============================================================================
// CONTACT & APPLICATION TYPES
// =============================================================================

export interface ContactInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
  category?: string;
}

export interface ApplicationInput {
  applicantName: string;
  applicantEmail: string;
  applicantRole?: string;
  companyName?: string;
  website?: string;
  type: 'CRYPTO_LAUNCH' | 'BUSINESS_RAISE' | 'PARTNERSHIP' | 'OTHER';
  description: string;
  raiseAmount?: string;
  timeline?: string;
  twitter?: string;
  discord?: string;
  telegram?: string;
  referralSource?: string;
}

// =============================================================================
// IDENTITY TYPES
// =============================================================================

export interface IdentityVerificationStart {
  userId: string;
  level?: 'basic' | 'standard' | 'verified';
  redirectUrl?: string;
}

export interface IdentityVerificationResult {
  id: string;
  status: string;
  level: string | null;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  isAccredited: boolean;
}

// =============================================================================
// DEX TYPES (PLACEHOLDER)
// =============================================================================

export interface DexPairInfo {
  id: string;
  tokenA: string;
  tokenB: string;
  reserveA: string | null;
  reserveB: string | null;
  fee: number;
  isActive: boolean;
  isRegulated: boolean;
  warmupEndsAt: Date | null;
  maxSlippage: number;
}

// =============================================================================
// ADMIN TYPES
// =============================================================================

export interface AdminFilters {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface AdminStatusUpdate {
  status: string;
  reason?: string;
  internalNote?: string;
}

export interface AdminNote {
  note: string;
  isInternal?: boolean;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// =============================================================================
// SECURITY TYPES
// =============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export interface SecurityEventInput {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  identifier?: string;
  description: string;
  metadata?: Record<string, unknown>;
  actionTaken?: string;
}

// =============================================================================
// LOGGING TYPES
// =============================================================================

export interface LogInput {
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'AUDIT';
  category: 'AUTH' | 'PROJECT' | 'BUSINESS' | 'ADMIN' | 'TRUST_SCORE' | 'SECURITY' | 'SYSTEM' | 'DEX' | 'IDENTITY';
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
}
