// =============================================================================
// MARK BACKEND - MAIN APPLICATION ENTRY POINT
// =============================================================================
// The Safe Market - Web3 platform for safe crypto launches and tokenized business raises
// =============================================================================

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import { config } from './config';
import { prisma } from './utils/prisma';
import { logger } from './utils/logger';

// Middleware
import {
  addSecurityHeaders,
  addRequestId,
  logRequests,
  sanitizeInputs,
  errorHandler,
  notFoundHandler,
  cleanupRateLimitRecords,
} from './middleware/security';
import { checkBlocked } from './middleware/auth';

// API Routes
import authRoutes from './api/auth';
import projectRoutes from './api/projects';
import businessRoutes from './api/businesses';
import contactRoutes from './api/contact';
import applicationRoutes from './api/applications';
import trustScoreRoutes from './api/trustScore';
import identityRoutes from './api/identity';
import dexRoutes from './api/dex';
import adminRoutes from './api/admin';

// =============================================================================
// CREATE EXPRESS APP
// =============================================================================

const app: Express = express();

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: config.isProduction ? undefined : false,
}));

// Custom security headers
app.use(addSecurityHeaders);

// CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    if (config.cors.allowedOrigins.includes(origin) || config.isDevelopment) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Captcha-Token'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID for tracing
app.use(addRequestId);

// Input sanitization
app.use(sanitizeInputs);

// Request logging
app.use(logRequests);

// Check blocked entities
app.use(checkBlocked);

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.env,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
    });
  }
});

// =============================================================================
// API ROUTES
// =============================================================================

const apiPrefix = `/api/${config.apiVersion}`;

// Public routes
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/projects`, projectRoutes);
app.use(`${apiPrefix}/businesses`, businessRoutes);
app.use(`${apiPrefix}/contact`, contactRoutes);
app.use(`${apiPrefix}/applications`, applicationRoutes);
app.use(`${apiPrefix}/trust-score`, trustScoreRoutes);
app.use(`${apiPrefix}/identity`, identityRoutes);
app.use(`${apiPrefix}/dex`, dexRoutes);

// Admin routes
app.use(`${apiPrefix}/admin`, adminRoutes);

// =============================================================================
// API DOCUMENTATION
// =============================================================================

app.get(`${apiPrefix}`, (req: Request, res: Response) => {
  res.json({
    name: 'MARK Backend API',
    version: config.apiVersion,
    description: 'The Safe Market - Web3 platform for safe crypto launches and tokenized business raises',
    documentation: 'https://docs.mark.io/api',
    endpoints: {
      health: '/health',
      auth: `${apiPrefix}/auth`,
      projects: `${apiPrefix}/projects`,
      businesses: `${apiPrefix}/businesses`,
      contact: `${apiPrefix}/contact`,
      applications: `${apiPrefix}/applications`,
      trustScore: `${apiPrefix}/trust-score`,
      identity: `${apiPrefix}/identity`,
      dex: `${apiPrefix}/dex`,
      admin: `${apiPrefix}/admin`,
    },
    features: {
      cryptoLaunches: 'Safe crypto project launches with mandatory safety features',
      businessRaises: 'Tokenized business raises with KYB verification',
      trustScore: 'Transparent trust scoring for all entities',
      identityVerification: 'Private identity verification (KYC optional for crypto, KYB for business)',
      dex: 'Coming soon - MEV-resistant decentralized exchange',
    },
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  try {
    await prisma.$disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// =============================================================================
// SCHEDULED TASKS
// =============================================================================

// Clean up old rate limit records every hour
setInterval(async () => {
  try {
    await cleanupRateLimitRecords();
  } catch (error) {
    console.error('Failed to cleanup rate limit records:', error);
  }
}, 60 * 60 * 1000);

// =============================================================================
// START SERVER
// =============================================================================

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start server
    app.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███╗   ███╗ █████╗ ██████╗ ██╗  ██╗                       ║
║   ████╗ ████║██╔══██╗██╔══██╗██║ ██╔╝                       ║
║   ██╔████╔██║███████║██████╔╝█████╔╝                        ║
║   ██║╚██╔╝██║██╔══██║██╔══██╗██╔═██╗                        ║
║   ██║ ╚═╝ ██║██║  ██║██║  ██║██║  ██╗                       ║
║   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝                       ║
║                                                              ║
║   The Safe Market - Backend API                              ║
║                                                              ║
║   Environment: ${config.env.padEnd(43)}║
║   Port: ${config.port.toString().padEnd(49)}║
║   API: ${apiPrefix.padEnd(50)}║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);

      logger.info('SYSTEM', 'SERVER_START', `Server started on port ${config.port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
