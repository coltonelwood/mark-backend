// =============================================================================
// MARK BACKEND - AUTHENTICATION MIDDLEWARE
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { verifyAccessToken } from '../utils/security';
import { logger, securityEvents } from '../utils/logger';
import { AuthenticatedRequest, JwtPayload } from '../types';
import { UserRole } from '@prisma/client';

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Authenticate user from JWT token
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Check if session is valid
    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      res.status(401).json({
        success: false,
        error: 'Session expired or revoked',
      });
      return;
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
      return;
    }

    // Attach user to request
    req.user = payload;
    req.sessionId = session.id;

    next();
  } catch (error) {
    await logger.error('AUTH', 'AUTH_ERROR', 'Authentication error', error as Error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token, but attaches user if valid
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    
    if (payload) {
      const session = await prisma.session.findUnique({
        where: { token },
      });

      if (session && !session.isRevoked && session.expiresAt > new Date()) {
        req.user = payload;
        req.sessionId = session.id;
      }
    }

    next();
  } catch {
    // Silently continue without auth
    next();
  }
}

// =============================================================================
// AUTHORIZATION MIDDLEWARE
// =============================================================================

/**
 * Require specific role(s)
 */
export function requireRole(...roles: UserRole[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      await securityEvents.recordSuspiciousActivity(
        req.user.userId,
        `Unauthorized role access attempt: ${req.user.role} tried to access ${roles.join(', ')} endpoint`,
        'medium'
      );

      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

/**
 * Require admin role
 */
export const requireAdmin = requireRole('ADMIN', 'SUPER_ADMIN');

/**
 * Require super admin role
 */
export const requireSuperAdmin = requireRole('SUPER_ADMIN');

// =============================================================================
// RESOURCE OWNERSHIP MIDDLEWARE
// =============================================================================

/**
 * Require ownership of a crypto project
 */
export async function requireProjectOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const projectId = req.params.id;
  if (!projectId) {
    res.status(400).json({
      success: false,
      error: 'Project ID required',
    });
    return;
  }

  // Admins can access any project
  if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
    next();
    return;
  }

  const project = await prisma.cryptoProject.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });

  if (!project) {
    res.status(404).json({
      success: false,
      error: 'Project not found',
    });
    return;
  }

  if (project.userId !== req.user.userId) {
    res.status(403).json({
      success: false,
      error: 'You do not own this project',
    });
    return;
  }

  next();
}

/**
 * Require ownership of a business
 */
export async function requireBusinessOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const businessId = req.params.id;
  if (!businessId) {
    res.status(400).json({
      success: false,
      error: 'Business ID required',
    });
    return;
  }

  // Admins can access any business
  if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
    next();
    return;
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { userId: true },
  });

  if (!business) {
    res.status(404).json({
      success: false,
      error: 'Business not found',
    });
    return;
  }

  if (business.userId !== req.user.userId) {
    res.status(403).json({
      success: false,
      error: 'You do not own this business',
    });
    return;
  }

  next();
}

// =============================================================================
// BLOCKED ENTITY CHECK
// =============================================================================

/**
 * Check if IP, wallet, or email is blocked
 */
export async function checkBlocked(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const walletAddress = req.user?.walletAddress;
  const email = req.user?.email;

  // Check blocked IPs
  const blockedIp = await prisma.blockedEntity.findFirst({
    where: {
      type: 'ip',
      value: ip,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  if (blockedIp) {
    await securityEvents.recordBlockedAttempt('ip', ip, req.path);
    res.status(403).json({
      success: false,
      error: 'Access denied',
    });
    return;
  }

  // Check blocked wallets
  if (walletAddress) {
    const blockedWallet = await prisma.blockedEntity.findFirst({
      where: {
        type: 'wallet',
        value: walletAddress,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (blockedWallet) {
      await securityEvents.recordBlockedAttempt('wallet', walletAddress, req.path);
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
  }

  // Check blocked emails
  if (email) {
    const blockedEmail = await prisma.blockedEntity.findFirst({
      where: {
        type: 'email',
        value: email,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (blockedEmail) {
      await securityEvents.recordBlockedAttempt('email', email, req.path);
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
  }

  next();
}
