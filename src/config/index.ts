// =============================================================================
// MARK BACKEND - CONFIGURATION
// =============================================================================

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  databaseUrl: process.env.DATABASE_URL!,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY!,
    algorithm: 'aes-256-gcm',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authMaxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3001').split(','),
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@mark.io',
    superAdminEmails: (process.env.SUPER_ADMIN_EMAILS || '').split(',').filter(Boolean),
  },

  // Identity Provider
  identity: {
    provider: process.env.IDENTITY_PROVIDER || 'persona',
    apiKey: process.env.IDENTITY_PROVIDER_API_KEY,
    templateId: process.env.IDENTITY_PROVIDER_TEMPLATE_ID,
  },

  // Storage
  storage: {
    provider: process.env.STORAGE_PROVIDER || 's3',
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET || 'mark-documents',
    },
    ipfs: {
      apiUrl: process.env.IPFS_API_URL,
      projectId: process.env.IPFS_PROJECT_ID,
      projectSecret: process.env.IPFS_PROJECT_SECRET,
    },
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@mark.io',
  },

  // Blockchain
  blockchain: {
    rpc: process.env.MARK_CHAIN_RPC,
    chainId: process.env.MARK_CHAIN_ID || 'mark-mainnet-1',
    multisigAddress: process.env.MULTISIG_ADDRESS,
  },

  // Security
  security: {
    captchaSecretKey: process.env.CAPTCHA_SECRET_KEY,
    captchaSiteKey: process.env.CAPTCHA_SITE_KEY,
    maxFailedLogins: 5,
    lockoutDurationMinutes: 30,
    passwordMinLength: 12,
    sessionMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    sentryDsn: process.env.SENTRY_DSN,
  },

  // Trust Score Configuration
  trustScore: {
    baseScore: 50,
    maxScore: 100,
    minScore: 0,
    
    // Crypto Project Rules
    crypto: {
      identityVerified: 20,
      liquidityLock6Months: 15,
      liquidityLock12Months: 20,
      vesting12Months: 10,
      vesting24Months: 15,
      profileComplete: 10,
      externalAudit: 10,
      whitepaperSocials: 5,
      contractVerified: 5,
    },
    
    // Business Rules
    business: {
      kybBasic: 10,
      kybStandard: 15,
      kybEnhanced: 20,
      financialDocs: 15,
      einRegistration: 10,
      profileComplete: 10,
      externalAccountingReview: 10,
      onTimeReports: 2, // per quarter
    },
    
    // Penalties
    penalties: {
      missedReport: -15,
      communityReport: -15,
      contractFlag: -10,
      kybExpired: -25,
      largeTeamSale: -20,
    },
  },
};

export type Config = typeof config;
export default config;
