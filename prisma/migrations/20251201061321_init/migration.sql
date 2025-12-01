-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'LIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'IN_REVIEW', 'KYB_PENDING', 'KYB_VERIFIED', 'APPROVED', 'REJECTED', 'LIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "KYBLevel" AS ENUM ('NONE', 'BASIC', 'STANDARD', 'ENHANCED');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('CRYPTO_LAUNCH', 'BUSINESS_RAISE', 'PARTNERSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "TrustScoreEventType" AS ENUM ('IDENTITY_VERIFIED', 'LIQUIDITY_LOCKED', 'VESTING_CONFIGURED', 'PROFILE_COMPLETED', 'AUDIT_SUBMITTED', 'DOCS_UPLOADED', 'KYB_VERIFIED', 'MANUAL_ADJUSTMENT', 'PENALTY_APPLIED', 'BONUS_APPLIED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR', 'SECURITY', 'AUDIT');

-- CreateEnum
CREATE TYPE "LogCategory" AS ENUM ('AUTH', 'PROJECT', 'BUSINESS', 'ADMIN', 'TRUST_SCORE', 'SECURITY', 'SYSTEM', 'DEX', 'IDENTITY');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('UTILITY', 'GOVERNANCE', 'EQUITY', 'REVENUE_SHARE', 'MEMBERSHIP');

-- CreateEnum
CREATE TYPE "VestingType" AS ENUM ('LINEAR', 'CLIFF_LINEAR', 'MILESTONE', 'CUSTOM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "walletAddress" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "apiCallCount" INTEGER NOT NULL DEFAULT 0,
    "apiCallResetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "description" TEXT,
    "category" TEXT,
    "website" TEXT,
    "whitepaper" TEXT,
    "twitter" TEXT,
    "discord" TEXT,
    "telegram" TEXT,
    "github" TEXT,
    "tokenType" "TokenType" NOT NULL DEFAULT 'UTILITY',
    "totalSupply" TEXT,
    "decimals" INTEGER NOT NULL DEFAULT 18,
    "teamAllocationPercent" DOUBLE PRECISION,
    "teamVestingMonths" INTEGER,
    "teamCliffMonths" INTEGER,
    "vestingType" "VestingType",
    "initialLiquidity" TEXT,
    "liquidityLockMonths" INTEGER,
    "liquidityLockTxHash" TEXT,
    "auditProvider" TEXT,
    "auditReportUrl" TEXT,
    "auditDate" TIMESTAMP(3),
    "contractAddress" TEXT,
    "contractVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "trustScoreUpdatedAt" TIMESTAMP(3),
    "launchDate" TIMESTAMP(3),
    "softCap" TEXT,
    "hardCap" TEXT,
    "minContribution" TEXT,
    "maxContribution" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileHash" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "dba" TEXT,
    "entityType" TEXT,
    "jurisdiction" TEXT,
    "ein" TEXT,
    "registrationNumber" TEXT,
    "incorporationDate" TIMESTAMP(3),
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "businessEmail" TEXT,
    "businessPhone" TEXT,
    "website" TEXT,
    "description" TEXT,
    "industry" TEXT,
    "employeeCount" INTEGER,
    "annualRevenue" TEXT,
    "linkedin" TEXT,
    "twitter" TEXT,
    "kybLevel" "KYBLevel" NOT NULL DEFAULT 'NONE',
    "kybProvider" TEXT,
    "kybVerifiedAt" TIMESTAMP(3),
    "kybExpiresAt" TIMESTAMP(3),
    "kybRejectionReason" TEXT,
    "tokenType" "TokenType",
    "raiseAmount" TEXT,
    "equityPercent" DOUBLE PRECISION,
    "revenueSharePercent" DOUBLE PRECISION,
    "minInvestment" TEXT,
    "maxInvestment" TEXT,
    "status" "BusinessStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "trustScoreUpdatedAt" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessFounder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "ownershipPercent" DOUBLE PRECISION,
    "walletAddress" TEXT,
    "linkedinUrl" TEXT,
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessFounder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessDocument" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileHash" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueReport" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossRevenue" TEXT NOT NULL,
    "eligibleRevenue" TEXT,
    "distributionAmount" TEXT,
    "documentUrl" TEXT,
    "documentHash" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateIdentityVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "IdentityStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "level" TEXT,
    "provider" TEXT,
    "providerSessionId" TEXT,
    "providerStatus" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "isAccredited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateIdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "category" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'NEW',
    "assignedTo" TEXT,
    "responseText" TEXT,
    "respondedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaunchApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "applicantName" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "applicantRole" TEXT,
    "companyName" TEXT,
    "website" TEXT,
    "type" "ApplicationType" NOT NULL,
    "description" TEXT NOT NULL,
    "raiseAmount" TEXT,
    "timeline" TEXT,
    "twitter" TEXT,
    "discord" TEXT,
    "telegram" TEXT,
    "referralSource" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaunchApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustScoreEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "businessId" TEXT,
    "userId" TEXT,
    "eventType" "TrustScoreEventType" NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNote" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "projectId" TEXT,
    "businessId" TEXT,
    "contactId" TEXT,
    "applicationId" TEXT,
    "note" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "category" "LogCategory" NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "responseTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DexPair" (
    "id" TEXT NOT NULL,
    "tokenA" TEXT NOT NULL,
    "tokenB" TEXT NOT NULL,
    "poolAddress" TEXT,
    "reserveA" TEXT,
    "reserveB" TEXT,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0.003,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRegulated" BOOLEAN NOT NULL DEFAULT false,
    "warmupEndsAt" TIMESTAMP(3),
    "maxSlippage" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DexPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitRecord" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "identifier" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "actionTaken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedEntity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "blockedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedEntity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "CryptoProject_userId_idx" ON "CryptoProject"("userId");

-- CreateIndex
CREATE INDEX "CryptoProject_status_idx" ON "CryptoProject"("status");

-- CreateIndex
CREATE INDEX "CryptoProject_trustScore_idx" ON "CryptoProject"("trustScore");

-- CreateIndex
CREATE INDEX "CryptoProject_category_idx" ON "CryptoProject"("category");

-- CreateIndex
CREATE INDEX "CryptoProject_createdAt_idx" ON "CryptoProject"("createdAt");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDocument_type_idx" ON "ProjectDocument"("type");

-- CreateIndex
CREATE INDEX "Business_userId_idx" ON "Business"("userId");

-- CreateIndex
CREATE INDEX "Business_status_idx" ON "Business"("status");

-- CreateIndex
CREATE INDEX "Business_kybLevel_idx" ON "Business"("kybLevel");

-- CreateIndex
CREATE INDEX "Business_trustScore_idx" ON "Business"("trustScore");

-- CreateIndex
CREATE INDEX "Business_industry_idx" ON "Business"("industry");

-- CreateIndex
CREATE INDEX "BusinessFounder_businessId_idx" ON "BusinessFounder"("businessId");

-- CreateIndex
CREATE INDEX "BusinessDocument_businessId_idx" ON "BusinessDocument"("businessId");

-- CreateIndex
CREATE INDEX "BusinessDocument_type_idx" ON "BusinessDocument"("type");

-- CreateIndex
CREATE INDEX "RevenueReport_businessId_idx" ON "RevenueReport"("businessId");

-- CreateIndex
CREATE INDEX "RevenueReport_period_idx" ON "RevenueReport"("period");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueReport_businessId_period_key" ON "RevenueReport"("businessId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateIdentityVerification_userId_key" ON "PrivateIdentityVerification"("userId");

-- CreateIndex
CREATE INDEX "PrivateIdentityVerification_status_idx" ON "PrivateIdentityVerification"("status");

-- CreateIndex
CREATE INDEX "PrivateIdentityVerification_provider_idx" ON "PrivateIdentityVerification"("provider");

-- CreateIndex
CREATE INDEX "ContactMessage_status_idx" ON "ContactMessage"("status");

-- CreateIndex
CREATE INDEX "ContactMessage_email_idx" ON "ContactMessage"("email");

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- CreateIndex
CREATE INDEX "LaunchApplication_status_idx" ON "LaunchApplication"("status");

-- CreateIndex
CREATE INDEX "LaunchApplication_type_idx" ON "LaunchApplication"("type");

-- CreateIndex
CREATE INDEX "LaunchApplication_createdAt_idx" ON "LaunchApplication"("createdAt");

-- CreateIndex
CREATE INDEX "TrustScoreEvent_projectId_idx" ON "TrustScoreEvent"("projectId");

-- CreateIndex
CREATE INDEX "TrustScoreEvent_businessId_idx" ON "TrustScoreEvent"("businessId");

-- CreateIndex
CREATE INDEX "TrustScoreEvent_userId_idx" ON "TrustScoreEvent"("userId");

-- CreateIndex
CREATE INDEX "TrustScoreEvent_eventType_idx" ON "TrustScoreEvent"("eventType");

-- CreateIndex
CREATE INDEX "TrustScoreEvent_createdAt_idx" ON "TrustScoreEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AdminNote_authorId_idx" ON "AdminNote"("authorId");

-- CreateIndex
CREATE INDEX "AdminNote_projectId_idx" ON "AdminNote"("projectId");

-- CreateIndex
CREATE INDEX "AdminNote_businessId_idx" ON "AdminNote"("businessId");

-- CreateIndex
CREATE INDEX "AdminNote_contactId_idx" ON "AdminNote"("contactId");

-- CreateIndex
CREATE INDEX "AdminNote_applicationId_idx" ON "AdminNote"("applicationId");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX "SystemLog_category_idx" ON "SystemLog"("category");

-- CreateIndex
CREATE INDEX "SystemLog_userId_idx" ON "SystemLog"("userId");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_action_idx" ON "SystemLog"("action");

-- CreateIndex
CREATE INDEX "DexPair_isActive_idx" ON "DexPair"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DexPair_tokenA_tokenB_key" ON "DexPair"("tokenA", "tokenB");

-- CreateIndex
CREATE INDEX "RateLimitRecord_identifier_idx" ON "RateLimitRecord"("identifier");

-- CreateIndex
CREATE INDEX "RateLimitRecord_windowStart_idx" ON "RateLimitRecord"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitRecord_identifier_endpoint_windowStart_key" ON "RateLimitRecord"("identifier", "endpoint", "windowStart");

-- CreateIndex
CREATE INDEX "SecurityEvent_eventType_idx" ON "SecurityEvent"("eventType");

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");

-- CreateIndex
CREATE INDEX "SecurityEvent_identifier_idx" ON "SecurityEvent"("identifier");

-- CreateIndex
CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "BlockedEntity_type_idx" ON "BlockedEntity"("type");

-- CreateIndex
CREATE INDEX "BlockedEntity_isActive_idx" ON "BlockedEntity"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedEntity_type_value_key" ON "BlockedEntity"("type", "value");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoProject" ADD CONSTRAINT "CryptoProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CryptoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessFounder" ADD CONSTRAINT "BusinessFounder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueReport" ADD CONSTRAINT "RevenueReport_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateIdentityVerification" ADD CONSTRAINT "PrivateIdentityVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunchApplication" ADD CONSTRAINT "LaunchApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustScoreEvent" ADD CONSTRAINT "TrustScoreEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CryptoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustScoreEvent" ADD CONSTRAINT "TrustScoreEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustScoreEvent" ADD CONSTRAINT "TrustScoreEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CryptoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "ContactMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "LaunchApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
