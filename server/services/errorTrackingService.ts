/**
 * ============================================================================
 * 🚨 Rindwa Emergency Platform - Error Tracking Service
 * ============================================================================
 * Comprehensive error tracking, monitoring, and alerting system
 */

import logger from '../utils/logger';
import { cache } from '../utils/cache';

export interface ErrorContext {
  userId?: string;
  userRole?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  requestId?: string;
  timestamp?: Date;
  environment?: string;
  version?: string;
  buildId?: string;
}

export interface ErrorMetrics {
  count: number;
  lastOccurrence: Date;
  firstOccurrence: Date;
  affectedUsers: Set<string>;
  errorRate: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (error: TrackedError, metrics: ErrorMetrics) => boolean;
  cooldown: number; // minutes
  channels: string[]; // email, slack, webhook
  enabled: boolean;
}

export interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  code?: string;
  type: string;
  context: ErrorContext;
  fingerprint: string;
  tags: string[];
  level: 'error' | 'warning' | 'info';
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
}

export class ErrorTrackingService {
  private errors: Map<string, TrackedError> = new Map();
  private metrics: Map<string, ErrorMetrics> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();

  constructor() {
    this.initializeDefaultAlertRules();
    
    // Clean up old errors periodically
    setInterval(() => this.cleanupOldErrors(), 60 * 60 * 1000); // 1 hour
  }

  /**
   * Track a new error occurrence
   */
  async trackError(
    error: Error | string,
    context: ErrorContext = {},
    level: 'error' | 'warning' | 'info' = 'error',
    tags: string[] = []
  ): Promise<string> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'object' ? error.stack : undefined;
    const errorName = typeof error === 'object' ? error.constructor.name : 'StringError';

    // Generate fingerprint for grouping similar errors
    const fingerprint = this.generateFingerprint(errorMessage, errorStack, context);
    
    // Create or update tracked error
    const trackedError: TrackedError = {
      id: this.errors.has(fingerprint) ? this.errors.get(fingerprint)!.id : this.generateId(),
      message: errorMessage,
      stack: errorStack,
      type: errorName,
      context: {
        ...context,
        timestamp: new Date(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        buildId: process.env.BUILD_ID || 'local'
      },
      fingerprint,
      tags,
      level,
      resolved: false
    };

    // Store error
    this.errors.set(fingerprint, trackedError);

    // Update metrics
    await this.updateMetrics(fingerprint, trackedError);

    // Check alert rules
    await this.checkAlertRules(trackedError);

    // Log to Winston
    logger.error('Error tracked', {
      errorId: trackedError.id,
      fingerprint,
      message: errorMessage,
      context,
      tags,
      level
    });

    // Cache for quick access
    await cache.set(`error:${fingerprint}`, trackedError, { ttl: 86400 }); // 24 hours

    return trackedError.id;
  }

  /**
   * Get error by fingerprint or ID
   */
  async getError(fingerprintOrId: string): Promise<TrackedError | null> {
    // Try fingerprint first
    let error = this.errors.get(fingerprintOrId);
    
    if (!error) {
      // Try cache
      error = await cache.get(`error:${fingerprintOrId}`);
    }

    if (!error) {
      // Search by ID
      for (const [, trackedError] of this.errors) {
        if (trackedError.id === fingerprintOrId) {
          return trackedError;
        }
      }
    }

    return error || null;
  }

  /**
   * Get error metrics
   */
  getMetrics(fingerprint: string): ErrorMetrics | null {
    return this.metrics.get(fingerprint) || null;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 50, level?: 'error' | 'warning' | 'info'): TrackedError[] {
    const errors = Array.from(this.errors.values())
      .filter(error => !level || error.level === level)
      .sort((a, b) => {
        const aTime = a.context.timestamp?.getTime() || 0;
        const bTime = b.context.timestamp?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, limit);

    return errors;
  }

  /**
   * Get error statistics
   */
  async getStatistics(timeRange: { start: Date; end: Date }) {
    const errors = Array.from(this.errors.values()).filter(error => {
      const errorTime = error.context.timestamp;
      return errorTime && errorTime >= timeRange.start && errorTime <= timeRange.end;
    });

    const statistics = {
      totalErrors: errors.length,
      errorsByLevel: {
        error: errors.filter(e => e.level === 'error').length,
        warning: errors.filter(e => e.level === 'warning').length,
        info: errors.filter(e => e.level === 'info').length
      },
      topErrors: this.getTopErrors(errors, 10),
      affectedUsers: new Set(errors.map(e => e.context.userId).filter(Boolean)).size,
      errorRate: this.calculateErrorRate(errors, timeRange),
      resolvedErrors: errors.filter(e => e.resolved).length,
      unresolvedErrors: errors.filter(e => !e.resolved).length
    };

    return statistics;
  }

  /**
   * Resolve an error
   */
  async resolveError(fingerprintOrId: string, resolvedBy: string, notes?: string): Promise<boolean> {
    const error = await this.getError(fingerprintOrId);
    
    if (!error) {
      return false;
    }

    error.resolved = true;
    error.resolvedAt = new Date();
    error.resolvedBy = resolvedBy;
    error.notes = notes;

    // Update storage
    this.errors.set(error.fingerprint, error);
    await cache.set(`error:${error.fingerprint}`, error, { ttl: 86400 });

    logger.info('Error resolved', {
      errorId: error.id,
      fingerprint: error.fingerprint,
      resolvedBy,
      notes
    });

    return true;
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    logger.info('Alert rule added', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    
    if (!rule) {
      return false;
    }

    Object.assign(rule, updates);
    this.alertRules.set(ruleId, rule);
    
    logger.info('Alert rule updated', { ruleId, updates });
    return true;
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    
    if (removed) {
      logger.info('Alert rule removed', { ruleId });
    }
    
    return removed;
  }

  /**
   * Generate error fingerprint for grouping
   */
  private generateFingerprint(message: string, stack?: string, context: ErrorContext = {}): string {
    // Normalize message (remove dynamic content)
    const normalizedMessage = message
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
      .replace(/\/[\w\-\.]+\.(js|ts|tsx)/gi, '/FILE') // Replace file paths
      .toLowerCase();

    // Use first few lines of stack trace if available
    const stackLines = stack?.split('\n').slice(0, 3).join('\n') || '';
    
    // Create fingerprint
    const fingerprintSource = `${normalizedMessage}:${stackLines}:${context.url || ''}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprintSource.length; i++) {
      const char = fingerprintSource.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update error metrics
   */
  private async updateMetrics(fingerprint: string, error: TrackedError): Promise<void> {
    let metrics = this.metrics.get(fingerprint);

    if (!metrics) {
      metrics = {
        count: 0,
        lastOccurrence: error.context.timestamp!,
        firstOccurrence: error.context.timestamp!,
        affectedUsers: new Set(),
        errorRate: 0,
        severity: 'low'
      };
    }

    // Update metrics
    metrics.count++;
    metrics.lastOccurrence = error.context.timestamp!;
    
    if (error.context.userId) {
      metrics.affectedUsers.add(error.context.userId);
    }

    // Calculate severity based on frequency and affected users
    metrics.severity = this.calculateSeverity(metrics);

    // Store updated metrics
    this.metrics.set(fingerprint, metrics);

    // Cache metrics
    await cache.set(`metrics:${fingerprint}`, metrics, { ttl: 3600 }); // 1 hour
  }

  /**
   * Calculate error severity
   */
  private calculateSeverity(metrics: ErrorMetrics): 'low' | 'medium' | 'high' | 'critical' {
    const hoursSinceFirst = (Date.now() - metrics.firstOccurrence.getTime()) / (1000 * 60 * 60);
    const errorRate = metrics.count / Math.max(hoursSinceFirst, 1);
    const affectedUsersCount = metrics.affectedUsers.size;

    if (errorRate > 10 || affectedUsersCount > 100) {
      return 'critical';
    } else if (errorRate > 5 || affectedUsersCount > 50) {
      return 'high';
    } else if (errorRate > 1 || affectedUsersCount > 10) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Check alert rules and send alerts
   */
  private async checkAlertRules(error: TrackedError): Promise<void> {
    const metrics = this.metrics.get(error.fingerprint);
    
    if (!metrics) {
      return;
    }

    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) {
        continue;
      }

      // Check cooldown
      const lastAlert = this.alertCooldowns.get(ruleId);
      if (lastAlert) {
        const cooldownEnd = new Date(lastAlert.getTime() + rule.cooldown * 60 * 1000);
        if (new Date() < cooldownEnd) {
          continue;
        }
      }

      // Check condition
      if (rule.condition(error, metrics)) {
        await this.sendAlert(rule, error, metrics);
        this.alertCooldowns.set(ruleId, new Date());
      }
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(rule: AlertRule, error: TrackedError, metrics: ErrorMetrics): Promise<void> {
    const alertData = {
      rule: rule.name,
      error: {
        id: error.id,
        message: error.message,
        type: error.type,
        level: error.level,
        fingerprint: error.fingerprint
      },
      metrics: {
        count: metrics.count,
        severity: metrics.severity,
        affectedUsers: metrics.affectedUsers.size,
        lastOccurrence: metrics.lastOccurrence
      },
      context: error.context
    };

    // Log alert
    logger.error('Alert triggered', {
      ruleId: rule.id,
      ruleName: rule.name,
      errorId: error.id,
      ...alertData
    });

    // Here you would integrate with external alerting services
    // For now, we'll just log
    console.log(`🚨 ALERT: ${rule.name}`, alertData);
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    // High error rate rule
    this.addAlertRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: (error, metrics) => metrics.count > 10 && metrics.severity === 'high',
      cooldown: 30, // 30 minutes
      channels: ['email', 'slack'],
      enabled: true
    });

    // Critical error rule
    this.addAlertRule({
      id: 'critical-error',
      name: 'Critical Error',
      condition: (error, metrics) => metrics.severity === 'critical',
      cooldown: 15, // 15 minutes
      channels: ['email', 'slack', 'webhook'],
      enabled: true
    });

    // Database error rule
    this.addAlertRule({
      id: 'database-error',
      name: 'Database Error',
      condition: (error) => error.message.toLowerCase().includes('database') || 
                             error.message.toLowerCase().includes('sequelize'),
      cooldown: 20, // 20 minutes
      channels: ['email'],
      enabled: true
    });

    // Authentication error rule
    this.addAlertRule({
      id: 'auth-error',
      name: 'Authentication Error Spike',
      condition: (error, metrics) => error.tags.includes('auth') && metrics.count > 5,
      cooldown: 10, // 10 minutes
      channels: ['slack'],
      enabled: true
    });
  }

  /**
   * Get top errors by frequency
   */
  private getTopErrors(errors: TrackedError[], limit: number): Array<{fingerprint: string, count: number, message: string}> {
    const errorCounts = new Map<string, {count: number, message: string}>();

    errors.forEach(error => {
      const existing = errorCounts.get(error.fingerprint);
      if (existing) {
        existing.count++;
      } else {
        errorCounts.set(error.fingerprint, {
          count: 1,
          message: error.message
        });
      }
    });

    return Array.from(errorCounts.entries())
      .map(([fingerprint, data]) => ({
        fingerprint,
        count: data.count,
        message: data.message
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(errors: TrackedError[], timeRange: { start: Date; end: Date }): number {
    const timeSpanHours = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60);
    return errors.length / Math.max(timeSpanHours, 1);
  }

  /**
   * Clean up old errors
   */
  private async cleanupOldErrors(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    let cleanedCount = 0;

    for (const [fingerprint, error] of this.errors) {
      if (error.context.timestamp && error.context.timestamp < cutoffDate && error.resolved) {
        this.errors.delete(fingerprint);
        this.metrics.delete(fingerprint);
        await cache.delete(`error:${fingerprint}`);
        await cache.delete(`metrics:${fingerprint}`);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old resolved errors`);
    }
  }
}

// Create singleton instance
export const errorTracker = new ErrorTrackingService(); 