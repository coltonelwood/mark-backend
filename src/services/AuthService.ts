// =============================================================================
// MARK BACKEND - AUTHENTICATION SERVICE
// =============================================================================

import { prisma } from '../utils/prisma';
import { config } from '../config';
import { logger, securityEvents } from '../utils/logger';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateSecureToken,
  sanitizeEmail,
  isValidEmail,
  isValidWalletAddress,
} from '../utils/security';
import {
  RegisterInput,
  LoginInput,
  AuthResponse,
  SafeUser,
  JwtPayload,
} from '../types';
import { User, UserRole } from '@prisma/client';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert User to SafeUser (strip sensitive fields)
 */
function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    walletAddress: user.walletAddress,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    isEmailVerified: user.isEmailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
  };
}

/**
 * Create JWT payload from user
 */
function createJwtPayload(user: User): JwtPayload {
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    walletAddress: user.walletAddress || undefined,
  };
}

// =============================================================================
// AUTH SERVICE CLASS
// =============================================================================

class AuthService {
  // ===========================================================================
  // REGISTRATION
  // ===========================================================================

  /**
   * Register a new user
   */
  async register(input: RegisterInput, ipAddress?: string): Promise<AuthResponse> {
    const email = sanitizeEmail(input.email);

    // Validate email
    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Validate wallet address if provided
    if (input.walletAddress && !isValidWalletAddress(input.walletAddress)) {
      throw new Error('Invalid wallet address format');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      await securityEvents.recordFailedLogin(email, ipAddress || 'unknown', 'Email already registered');
      throw new Error('Email already registered');
    }

    // Check if wallet already exists
    if (input.walletAddress) {
      const existingWallet = await prisma.user.findUnique({
        where: { walletAddress: input.walletAddress },
      });

      if (existingWallet) {
        throw new Error('Wallet address already registered');
      }
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Determine if this is a super admin (first user or in super admin list)
    const userCount = await prisma.user.count();
    const isSuperAdmin = userCount === 0 || config.admin.superAdminEmails.includes(email);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        walletAddress: input.walletAddress,
        displayName: input.displayName,
        role: isSuperAdmin ? 'SUPER_ADMIN' : 'USER',
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Create session
    const payload = createJwtPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        ipAddress,
        expiresAt: new Date(Date.now() + config.security.sessionMaxAge),
      },
    });

    await logger.audit('AUTH', 'USER_REGISTERED', `New user registered: ${email}`, user.id, { ipAddress });

    return {
      user: toSafeUser(user),
      accessToken,
      refreshToken,
      expiresIn: config.security.sessionMaxAge,
    };
  }

  // ===========================================================================
  // LOGIN
  // ===========================================================================

  /**
   * Login a user
   */
  async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const email = sanitizeEmail(input.email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await securityEvents.recordFailedLogin(email, ipAddress || 'unknown', 'User not found');
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      await securityEvents.recordFailedLogin(email, ipAddress || 'unknown', 'Account locked');
      throw new Error(`Account is locked. Try again in ${remainingMinutes} minutes.`);
    }

    // Check if account is active
    if (!user.isActive) {
      await securityEvents.recordFailedLogin(email, ipAddress || 'unknown', 'Account deactivated');
      throw new Error('Account has been deactivated');
    }

    // Verify password
    const isValid = await verifyPassword(input.password, user.passwordHash);

    if (!isValid) {
      // Increment failed login count
      const newFailedCount = user.failedLoginCount + 1;
      const shouldLock = newFailedCount >= config.security.maxFailedLogins;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: newFailedCount,
          lockedUntil: shouldLock
            ? new Date(Date.now() + config.security.lockoutDurationMinutes * 60 * 1000)
            : undefined,
        },
      });

      await securityEvents.recordFailedLogin(email, ipAddress || 'unknown', 'Invalid password');

      if (shouldLock) {
        throw new Error(`Too many failed attempts. Account locked for ${config.security.lockoutDurationMinutes} minutes.`);
      }

      throw new Error('Invalid email or password');
    }

    // Reset failed login count and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Revoke old sessions (optional: could allow multiple sessions)
    // await this.revokeAllSessions(user.id);

    // Create new session
    const payload = createJwtPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + config.security.sessionMaxAge),
      },
    });

    await logger.audit('AUTH', 'USER_LOGIN', `User logged in: ${email}`, user.id, { ipAddress });

    return {
      user: toSafeUser(user),
      accessToken,
      refreshToken,
      expiresIn: config.security.sessionMaxAge,
    };
  }

  // ===========================================================================
  // LOGOUT
  // ===========================================================================

  /**
   * Logout a user (revoke session)
   */
  async logout(token: string, userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: {
        token,
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'User logout',
      },
    });

    await logger.audit('AUTH', 'USER_LOGOUT', `User logged out`, userId);
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userId: string, reason: string = 'Revoked all sessions'): Promise<void> {
    await prisma.session.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    await logger.security('SESSIONS_REVOKED', `All sessions revoked for user ${userId}`, userId);
  }

  // ===========================================================================
  // TOKEN REFRESH
  // ===========================================================================

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // Check if session exists and is not revoked
    const session = await prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new Error('Session expired or revoked');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate new access token
    const newPayload = createJwtPayload(user);
    const accessToken = generateAccessToken(newPayload);

    // Update session with new access token
    await prisma.session.update({
      where: { id: session.id },
      data: { token: accessToken },
    });

    return {
      accessToken,
      expiresIn: config.security.sessionMaxAge,
    };
  }

  // ===========================================================================
  // GET CURRENT USER
  // ===========================================================================

  /**
   * Get current user from JWT payload
   */
  async getCurrentUser(userId: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return toSafeUser(user);
  }

  // ===========================================================================
  // PASSWORD MANAGEMENT
  // ===========================================================================

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Hash and update
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all sessions
    await this.revokeAllSessions(userId, 'Password changed');

    await logger.audit('AUTH', 'PASSWORD_CHANGED', `Password changed for user`, userId);
  }

  /**
   * Request password reset (send email with token)
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: sanitizeEmail(email) },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return;
    }

    const resetToken = generateSecureToken(32);
    
    // In production, you would:
    // 1. Store the token with expiry
    // 2. Send email with reset link
    
    await logger.audit('AUTH', 'PASSWORD_RESET_REQUESTED', `Password reset requested`, user.id);
  }

  // ===========================================================================
  // SESSION VALIDATION
  // ===========================================================================

  /**
   * Validate session is still active
   */
  async validateSession(token: string): Promise<boolean> {
    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session) return false;
    if (session.isRevoked) return false;
    if (session.expiresAt < new Date()) return false;

    return true;
  }
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================

export const authService = new AuthService();
export default authService;
