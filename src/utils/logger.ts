// =============================================================================
// MARK BACKEND - LOGGING SERVICE
// =============================================================================

import { prisma } from './prisma';
import { LogInput, SecurityEventInput } from '../types';
import { config } from '../config';

// =============================================================================
// SYSTEM LOGGING
// =============================================================================

class LoggingService {
  /**
   * Create a system log entry
   */
  async log(input: LogInput): Promise<void> {
    try {
      await prisma.systemLog.create({
        data: {
          level: input.level,
          category: input.category,
          action: input.action,
          message: input.message,
          metadata: (input.metadata ?? undefined) as any,
          userId: input.userId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          requestId: input.requestId,
          endpoint: input.endpoint,
          method: input.method,
          statusCode: input.statusCode,
          responseTime: input.responseTime,
        },
      });

      // Also log to console in development
      if (config.isDevelopment) {
        const logMethod = input.level === 'ERROR' ? console.error : console.log;
        logMethod(`[${input.level}] [${input.category}] ${input.action}: ${input.message}`);
      }
    } catch (error) {
      // Don't throw - logging should never break the application
      console.error('Failed to write system log:', error);
    }
  }

  /**
   * Log an info message
   */
  async info(
    category: LogInput['category'],
    action: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({ level: 'INFO', category, action, message, metadata });
  }

  /**
   * Log a warning message
   */
  async warn(
    category: LogInput['category'],
    action: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({ level: 'WARN', category, action, message, metadata });
  }

  /**
   * Log an error message
   */
  async error(
    category: LogInput['category'],
    action: string,
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      level: 'ERROR',
      category,
      action,
      message,
      metadata: {
        ...metadata,
        errorName: error?.name,
        errorMessage: error?.message,
        errorStack: config.isDevelopment ? error?.stack : undefined,
      },
    });
  }

  /**
   * Log a security event
   */
  async security(
    action: string,
    message: string,
    userId?: string,
    ipAddress?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      level: 'SECURITY',
      category: 'SECURITY',
      action,
      message,
      userId,
      ipAddress,
      metadata,
    });
  }

  /**
   * Log an audit event (for compliance tracking)
   */
  async audit(
    category: LogInput['category'],
    action: string,
    message: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      level: 'AUDIT',
      category,
      action,
      message,
      userId,
      metadata,
    });
  }

  /**
   * Log API request (middleware helper)
   */
  async logRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    ipAddress?: string,
    requestId?: string
  ): Promise<void> {
    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    
    await this.log({
      level,
      category: 'SYSTEM',
      action: 'API_REQUEST',
      message: `${method} ${endpoint} ${statusCode}`,
      userId,
      ipAddress,
      requestId,
      endpoint,
      method,
      statusCode,
      responseTime,
    });
  }
}

// =============================================================================
// SECURITY EVENT LOGGING
// =============================================================================

class SecurityEventService {
  /**
   * Record a security event
   */
  async record(input: SecurityEventInput): Promise<void> {
    try {
      await prisma.securityEvent.create({
        data: {
          eventType: input.eventType,
          severity: input.severity,
          identifier: input.identifier,
          description: input.description,
          metadata: input.metadata || undefined,
          actionTaken: input.actionTaken,
        },
      });

      // Log to system logs as well
      await logger.security(
        input.eventType,
        input.description,
        undefined,
        input.identifier,
        input.metadata
      );
    } catch (error) {
      console.error('Failed to record security event:', error);
    }
  }

  /**
   * Record a failed login attempt
   */
  async recordFailedLogin(
    email: string,
    ipAddress: string,
    reason: string
  ): Promise<void> {
    await this.record({
      eventType: 'failed_login',
      severity: 'medium',
      identifier: ipAddress,
      description: `Failed login attempt for ${email}: ${reason}`,
      metadata: { email },
    });
  }

  /**
   * Record a suspicious activity
   */
  async recordSuspiciousActivity(
    identifier: string,
    description: string,
    severity: SecurityEventInput['severity'] = 'medium',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.record({
      eventType: 'suspicious_activity',
      severity,
      identifier,
      description,
      metadata,
    });
  }

  /**
   * Record rate limit exceeded
   */
  async recordRateLimitExceeded(
    identifier: string,
    endpoint: string
  ): Promise<void> {
    await this.record({
      eventType: 'rate_limit_exceeded',
      severity: 'low',
      identifier,
      description: `Rate limit exceeded for ${endpoint}`,
      metadata: { endpoint },
    });
  }

  /**
   * Record a blocked entity attempt
   */
  async recordBlockedAttempt(
    type: string,
    value: string,
    endpoint: string
  ): Promise<void> {
    await this.record({
      eventType: 'blocked_entity_attempt',
      severity: 'high',
      identifier: value,
      description: `Blocked ${type} attempted access to ${endpoint}`,
      metadata: { type, endpoint },
      actionTaken: 'blocked',
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const logger = new LoggingService();
export const securityEvents = new SecurityEventService();

export default logger;
