// =============================================================================
// MARK BACKEND - AUTH API ROUTES
// =============================================================================

import { Router, Response } from 'express';
import { authService } from '../services/AuthService';
import { authenticate } from '../middleware/auth';
import { authRateLimiter, verifyCaptcha } from '../middleware/security';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// =============================================================================
// POST /auth/register - Register new user
// =============================================================================

router.post(
  '/register',
  authRateLimiter,
  verifyCaptcha,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, password, walletAddress, displayName } = req.body;
      const ip = req.ip || req.socket.remoteAddress;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
        return;
      }

      const result = await authService.register(
        { email, password, walletAddress, displayName },
        ip
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
);

// =============================================================================
// POST /auth/login - Login user
// =============================================================================

router.post(
  '/login',
  authRateLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required',
        });
        return;
      }

      const result = await authService.login({ email, password }, ip, userAgent);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      res.status(401).json({
        success: false,
        error: message,
      });
    }
  }
);

// =============================================================================
// POST /auth/logout - Logout user
// =============================================================================

router.post(
  '/logout',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const token = req.headers.authorization?.substring(7);
      
      if (token && req.user) {
        await authService.logout(token, req.user.userId);
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      await logger.error('AUTH', 'LOGOUT_ERROR', 'Logout error', error as Error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
      });
    }
  }
);

// =============================================================================
// GET /auth/me - Get current user
// =============================================================================

router.get(
  '/me',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const user = await authService.getCurrentUser(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      await logger.error('AUTH', 'GET_ME_ERROR', 'Get current user error', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user',
      });
    }
  }
);

// =============================================================================
// POST /auth/refresh - Refresh access token
// =============================================================================

router.post(
  '/refresh',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      res.status(401).json({
        success: false,
        error: message,
      });
    }
  }
);

// =============================================================================
// POST /auth/change-password - Change password
// =============================================================================

router.post(
  '/change-password',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password and new password are required',
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      await authService.changePassword(req.user.userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully. Please log in again.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password change failed';
      res.status(400).json({
        success: false,
        error: message,
      });
    }
  }
);

// =============================================================================
// POST /auth/forgot-password - Request password reset
// =============================================================================

router.post(
  '/forgot-password',
  authRateLimiter,
  verifyCaptcha,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required',
        });
        return;
      }

      await authService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error) {
      // Still return success to prevent enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }
  }
);

export default router;
