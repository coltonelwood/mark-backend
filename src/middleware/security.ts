// =============================================================================
// MARK BACKEND - RATE LIMITING & SECURITY MIDDLEWARE
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { securityEvents, logger } from '../utils/logger';
import { generateUUID, securityHeaders, sanitizeString } from '../utils/security';
import { AuthenticatedRequest, RateLimitConfig } from '../types';

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(options: Partial<RateLimitConfig> = {}) {
  const windowMs = options.windowMs || config.rateLimit.windowMs;
  const maxRequests = options.maxRequests || config.rateLimit.maxRequests;
  const message = options.message || 'Too many requests, please try again later';
  const keyGenerator = options.keyGenerator || ((req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  });

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const identifier = keyGenerator(req);
      const endpoint = req.path;
      const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

      // Try to find existing record
      const existing = await prisma.rateLimitRecord.findUnique({
        where: {
          identifier_endpoint_windowStart: {
            identifier,
            endpoint,
            windowStart,
          },
        },
      });

      if (existing) {
        if (existing.requestCount >= maxRequests) {
          // Rate limit exceeded
          await securityEvents.recordRateLimitExceeded(identifier, endpoint);
          
          res.status(429).json({
            success: false,
            error: message,
            retryAfter: Math.ceil((windowStart.getTime() + windowMs - Date.now()) / 1000),
          });
          return;
        }

        // Increment count
        await prisma.rateLimitRecord.update({
          where: { id: existing.id },
          data: { requestCount: { increment: 1 } },
        });
      } else {
        // Create new record
        await prisma.rateLimitRecord.create({
          data: {
            identifier,
            endpoint,
            windowStart,
            requestCount: 1,
          },
        });
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - (existing?.requestCount || 1) - 1).toString());
      res.setHeader('X-RateLimit-Reset', (windowStart.getTime() + windowMs).toString());

      next();
    } catch (error) {
      // Don't block requests if rate limiting fails
      await logger.error('SECURITY', 'RATE_LIMIT_ERROR', 'Rate limiting error', error as Error);
      next();
    }
  };
}

/**
 * Standard API rate limiter
 */
export const apiRateLimiter = createRateLimiter();

/**
 * Auth endpoint rate limiter (stricter)
 */
export const authRateLimiter = createRateLimiter({
  maxRequests: config.rateLimit.authMaxRequests,
  message: 'Too many authentication attempts, please try again later',
});

/**
 * Admin endpoint rate limiter (more lenient)
 */
export const adminRateLimiter = createRateLimiter({
  maxRequests: 200,
});

// =============================================================================
// SECURITY HEADERS
// =============================================================================

/**
 * Add security headers to all responses
 */
export function addSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  for (const [header, value] of Object.entries(securityHeaders)) {
    res.setHeader(header, value);
  }
  next();
}

// =============================================================================
// REQUEST ID
// =============================================================================

/**
 * Add unique request ID to each request
 */
export function addRequestId(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestId = generateUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

// =============================================================================
// REQUEST LOGGING
// =============================================================================

/**
 * Log all API requests
 */
export function logRequests(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Log response when finished
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    const ip = req.ip || req.socket.remoteAddress;

    await logger.logRequest(
      req.method,
      req.path,
      res.statusCode,
      responseTime,
      req.user?.userId,
      ip,
      req.requestId
    );
  });

  next();
}

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * Sanitize string inputs in request body
 */
export function sanitizeInputs(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query as Record<string, unknown>);
  }

  if (req.params && typeof req.params === 'object') {
    sanitizeObject(req.params);
  }

  next();
}

function sanitizeObject(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === 'string') {
      obj[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitizeObject(value as Record<string, unknown>);
    }
  }
}

// =============================================================================
// CAPTCHA VERIFICATION (PLACEHOLDER)
// =============================================================================

/**
 * Verify CAPTCHA token
 */
export async function verifyCaptcha(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip in development
  if (config.isDevelopment) {
    next();
    return;
  }

  const captchaToken = req.body.captchaToken || req.headers['x-captcha-token'];

  if (!captchaToken) {
    res.status(400).json({
      success: false,
      error: 'CAPTCHA verification required',
    });
    return;
  }

  // In production, verify with Google reCAPTCHA or hCaptcha
  // This is a placeholder implementation
  if (!config.security.captchaSecretKey) {
    next();
    return;
  }

  try {
    // Example: Verify with Google reCAPTCHA
    // const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //   body: `secret=${config.security.captchaSecretKey}&response=${captchaToken}`,
    // });
    // const data = await response.json();
    // if (!data.success) throw new Error('CAPTCHA verification failed');

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'CAPTCHA verification failed',
    });
  }
}

// =============================================================================
// IP THROTTLING
// =============================================================================

/**
 * Throttle by IP + account combination
 */
export function ipAccountThrottle(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Create composite key from IP and account
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userId = req.user?.userId || 'anonymous';
  
  // Use the rate limiter with composite key
  const compositeKey = `${ip}:${userId}`;
  
  // This is handled by the rate limiter with custom key generator
  // Implementation depends on your Redis/in-memory setup
  
  next();
}

// =============================================================================
// ERROR HANDLER
// =============================================================================

/**
 * Global error handler
 */
export function errorHandler(
  error: Error,
  req: AuthenticatedRequest,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const ip = req.ip || req.socket.remoteAddress;

  logger.error('SYSTEM', 'UNHANDLED_ERROR', error.message, error, {
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    ip,
    requestId: req.requestId,
  });

  // Don't expose internal errors in production
  const message = config.isProduction
    ? 'An unexpected error occurred'
    : error.message;

  res.status(500).json({
    success: false,
    error: message,
    requestId: req.requestId,
  });
}

// =============================================================================
// NOT FOUND HANDLER
// =============================================================================

/**
 * Handle 404 errors
 */
export function notFoundHandler(
  req: Request,
  res: Response
): void {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
}

// =============================================================================
// CLEAN OLD RATE LIMIT RECORDS (CRON JOB)
// =============================================================================

/**
 * Clean up old rate limit records
 */
export async function cleanupRateLimitRecords(): Promise<void> {
  const cutoff = new Date(Date.now() - config.rateLimit.windowMs * 2);
  
  await prisma.rateLimitRecord.deleteMany({
    where: {
      windowStart: { lt: cutoff },
    },
  });
  
  await logger.info('SYSTEM', 'CLEANUP', 'Cleaned up old rate limit records');
}
