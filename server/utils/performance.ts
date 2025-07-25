/**
 * ============================================================================
 * ⚡ Rindwa Emergency Platform - Performance Monitoring & Optimization
 * ============================================================================
 * Advanced performance monitoring, profiling, and optimization utilities
 * for high-performance emergency response operations
 */

import { performance } from 'perf_hooks';
import logger from './logger';
import { cache } from './cache';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceProfile {
  operationId: string;
  totalDuration: number;
  stages: Array<{
    name: string;
    duration: number;
    percentage: number;
  }>;
  bottlenecks: Array<{
    stage: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
}

interface SystemHealth {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  cache: {
    hitRate: number;
    size: number;
    connected: boolean;
  };
  database: {
    activeConnections: number;
    avgQueryTime: number;
    slowQueries: number;
  };
  api: {
    avgResponseTime: number;
    errorRate: number;
    throughput: number;
  };
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeOperations: Map<string, { start: number; stages: Map<string, number> }> = new Map();
  private alertThresholds = {
    responseTime: 1000, // ms
    memoryUsage: 80, // percentage
    errorRate: 5, // percentage
    cacheHitRate: 70 // percentage
  };

  /**
   * Start performance tracking for an operation
   */
  startOperation(operationId: string, metadata?: Record<string, any>): void {
    this.activeOperations.set(operationId, {
      start: performance.now(),
      stages: new Map()
    });

    logger.debug('Performance tracking started', { operationId, metadata });
  }

  /**
   * Mark a stage completion within an operation
   */
  markStage(operationId: string, stageName: string): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      logger.warn('Performance stage marked for unknown operation', { operationId, stageName });
      return;
    }

    const now = performance.now();
    const stageDuration = now - (operation.stages.get('_last') || operation.start);
    operation.stages.set(stageName, stageDuration);
    operation.stages.set('_last', now);

    logger.debug('Performance stage marked', { operationId, stageName, duration: stageDuration });
  }

  /**
   * End performance tracking for an operation
   */
  endOperation(operationId: string, metadata?: Record<string, any>): PerformanceProfile {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      logger.warn('Performance tracking ended for unknown operation', { operationId });
      return this.createEmptyProfile(operationId);
    }

    const totalDuration = performance.now() - operation.start;
    this.activeOperations.delete(operationId);

    // Create performance profile
    const stages = Array.from(operation.stages.entries())
      .filter(([name]) => name !== '_last')
      .map(([name, duration]) => ({
        name,
        duration,
        percentage: Math.round((duration / totalDuration) * 100)
      }))
      .sort((a, b) => b.duration - a.duration);

    const profile: PerformanceProfile = {
      operationId,
      totalDuration,
      stages,
      bottlenecks: this.identifyBottlenecks(stages, totalDuration)
    };

    // Store metric
    this.recordMetric(operationId, totalDuration, metadata);

    // Check for performance alerts
    this.checkAlerts(profile);

    logger.debug('Performance tracking completed', { 
      operationId, 
      totalDuration, 
      stagesCount: stages.length 
    });

    return profile;
  }

  /**
   * Record a simple performance metric
   */
  recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Keep only last 1000 metrics per type
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
  }

  /**
   * Get performance statistics for a metric
   */
  getMetricStats(name: string, timeWindow?: number): {
    count: number;
    average: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  } {
    const metrics = this.metrics.get(name) || [];
    const cutoff = timeWindow ? Date.now() - timeWindow : 0;
    const filteredMetrics = metrics
      .filter(m => m.timestamp >= cutoff)
      .map(m => m.duration)
      .sort((a, b) => a - b);

    if (filteredMetrics.length === 0) {
      return { count: 0, average: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }

    const count = filteredMetrics.length;
    const sum = filteredMetrics.reduce((acc, val) => acc + val, 0);
    const average = sum / count;

    const getPercentile = (p: number) => {
      const index = Math.ceil(count * p) - 1;
      return filteredMetrics[Math.max(0, index)];
    };

    return {
      count,
      average: Math.round(average * 100) / 100,
      median: getPercentile(0.5),
      p95: getPercentile(0.95),
      p99: getPercentile(0.99),
      min: filteredMetrics[0],
      max: filteredMetrics[count - 1]
    };
  }

  /**
   * Get current system health metrics
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const cacheStats = cache.getStats();

    // Get API metrics from recent performance data
    const apiMetrics = this.getMetricStats('api_request', 60000); // Last 60 seconds
    const errorMetrics = this.getMetricStats('api_error', 60000);

    return {
      cpu: {
        usage: Math.round((cpuUsage.user + cpuUsage.system) / 1000000), // Convert to ms
        loadAverage: [0, 0, 0] // Mock data - would use os.loadavg() in real implementation
      },
      memory: {
        used: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        free: Math.round((memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      cache: {
        hitRate: cacheStats.hits > 0 ? Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100) : 0,
        size: cacheStats.memorySize,
        connected: cacheStats.redisConnected
      },
      database: {
        activeConnections: 0, // Mock data - would integrate with actual DB pool
        avgQueryTime: 0, // Mock data - would track from actual queries
        slowQueries: 0 // Mock data - would track from query logs
      },
      api: {
        avgResponseTime: apiMetrics.average,
        errorRate: apiMetrics.count > 0 ? Math.round((errorMetrics.count / apiMetrics.count) * 100) : 0,
        throughput: Math.round(apiMetrics.count / 60) // Requests per second
      }
    };
  }

  /**
   * Performance decorator for async functions
   */
  monitor<T extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: T,
    options: { cacheKey?: string; cacheTTL?: number } = {}
  ): T {
    return (async (...args: any[]) => {
      const operationId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check cache first if cacheKey provided
      if (options.cacheKey) {
        const cacheKey = typeof options.cacheKey === 'string' 
          ? options.cacheKey 
          : `${name}_${JSON.stringify(args)}`;
        
        const cached = await cache.get(cacheKey);
        if (cached !== null) {
          this.recordMetric(`${name}_cache_hit`, 0);
          return cached;
        }
      }

      this.startOperation(operationId, { name, args: args.length });

      try {
        this.markStage(operationId, 'execution_start');
        const result = await fn(...args);
        this.markStage(operationId, 'execution_complete');

        // Cache result if requested
        if (options.cacheKey) {
          const cacheKey = typeof options.cacheKey === 'string' 
            ? options.cacheKey 
            : `${name}_${JSON.stringify(args)}`;
          
          await cache.set(cacheKey, result, { ttl: options.cacheTTL || 300 });
          this.markStage(operationId, 'cache_store');
        }

        const profile = this.endOperation(operationId, { success: true });
        this.recordMetric(name, profile.totalDuration);
        
        return result;

      } catch (error) {
        this.markStage(operationId, 'error_handling');
        const profile = this.endOperation(operationId, { success: false, error: (error as Error).message });
        this.recordMetric(`${name}_error`, profile.totalDuration);
        this.recordMetric('api_error', 1); // For error rate calculation
        
        throw error;
      }
    }) as T;
  }

  /**
   * Generate performance optimization recommendations
   */
  async generateRecommendations(): Promise<Array<{
    category: 'cache' | 'database' | 'api' | 'memory';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
    impact: string;
  }>> {
    const recommendations = [];
    const health = await this.getSystemHealth();

    // Cache recommendations
    if (health.cache.hitRate < this.alertThresholds.cacheHitRate) {
      recommendations.push({
        category: 'cache' as const,
        priority: 'high' as const,
        title: 'Low Cache Hit Rate',
        description: `Cache hit rate is ${health.cache.hitRate}%, below the ${this.alertThresholds.cacheHitRate}% threshold.`,
        action: 'Review caching strategy and increase TTL for frequently accessed data.',
        impact: 'Improved response times and reduced database load'
      });
    }

    // Memory recommendations
    if (health.memory.percentage > this.alertThresholds.memoryUsage) {
      recommendations.push({
        category: 'memory' as const,
        priority: 'high' as const,
        title: 'High Memory Usage',
        description: `Memory usage is ${health.memory.percentage}%, exceeding the ${this.alertThresholds.memoryUsage}% threshold.`,
        action: 'Optimize memory usage by reducing cache size or scaling horizontally.',
        impact: 'Improved system stability and performance'
      });
    }

    // API recommendations
    if (health.api.avgResponseTime > this.alertThresholds.responseTime) {
      recommendations.push({
        category: 'api' as const,
        priority: 'medium' as const,
        title: 'Slow API Response Time',
        description: `Average API response time is ${health.api.avgResponseTime}ms, exceeding the ${this.alertThresholds.responseTime}ms threshold.`,
        action: 'Optimize database queries and implement additional caching.',
        impact: 'Better user experience and reduced system load'
      });
    }

    return recommendations;
  }

  /**
   * Clear performance data
   */
  clearMetrics(olderThan?: number): void {
    const cutoff = olderThan || (Date.now() - 24 * 60 * 60 * 1000); // 24 hours default

    const entries = Array.from(this.metrics.entries());
    for (const [name, metrics] of entries) {
      const filtered = metrics.filter((m: PerformanceMetric) => m.timestamp >= cutoff);
      this.metrics.set(name, filtered);
    }

    logger.info('Performance metrics cleared', { cutoff: new Date(cutoff) });
  }

  /**
   * Export performance data for analysis
   */
  exportMetrics(timeWindow?: number): Record<string, any> {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0;
    const exported: Record<string, any> = {};

    const entries = Array.from(this.metrics.entries());
    for (const [name, metrics] of entries) {
      const filtered = metrics.filter((m: PerformanceMetric) => m.timestamp >= cutoff);
      exported[name] = {
        count: filtered.length,
        stats: this.getMetricStats(name, timeWindow),
        recent: filtered.slice(-10) // Last 10 entries
      };
    }

    return {
      exportedAt: new Date().toISOString(),
      timeWindow: timeWindow || 'all',
      metrics: exported,
      systemHealth: this.getSystemHealth()
    };
  }

  /**
   * Private: Create empty performance profile
   */
  private createEmptyProfile(operationId: string): PerformanceProfile {
    return {
      operationId,
      totalDuration: 0,
      stages: [],
      bottlenecks: []
    };
  }

  /**
   * Private: Identify performance bottlenecks
   */
  private identifyBottlenecks(stages: Array<{ name: string; duration: number; percentage: number }>, totalDuration: number) {
    const bottlenecks = [];

    for (const stage of stages) {
      if (stage.percentage > 50) {
        bottlenecks.push({
          stage: stage.name,
          impact: 'high' as const,
          recommendation: `Stage '${stage.name}' takes ${stage.percentage}% of total time. Consider optimization.`
        });
      } else if (stage.percentage > 25) {
        bottlenecks.push({
          stage: stage.name,
          impact: 'medium' as const,
          recommendation: `Stage '${stage.name}' takes ${stage.percentage}% of total time. Monitor for optimization opportunities.`
        });
      } else if (stage.duration > 500) {
        bottlenecks.push({
          stage: stage.name,
          impact: 'low' as const,
          recommendation: `Stage '${stage.name}' duration (${stage.duration}ms) could be optimized.`
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Private: Check for performance alerts
   */
  private checkAlerts(profile: PerformanceProfile): void {
    if (profile.totalDuration > this.alertThresholds.responseTime) {
      logger.warn('Performance alert: Slow operation detected', {
        operationId: profile.operationId,
        duration: profile.totalDuration,
        threshold: this.alertThresholds.responseTime
      });
    }

    // Check for stages that are significantly slower than others
    const avgStageDuration = profile.stages.reduce((sum, stage) => sum + stage.duration, 0) / profile.stages.length;
    const slowStages = profile.stages.filter(stage => stage.duration > avgStageDuration * 2);

    if (slowStages.length > 0) {
      logger.warn('Performance alert: Slow stages detected', {
        operationId: profile.operationId,
        slowStages: slowStages.map(s => ({ name: s.name, duration: s.duration }))
      });
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper functions for common performance patterns
export const withPerformanceMonitoring = performanceMonitor.monitor.bind(performanceMonitor);

export const measureTime = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    performanceMonitor.recordMetric(name, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.recordMetric(`${name}_error`, duration);
    throw error;
  }
};

// Middleware for Express.js route performance monitoring
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const operationId = `${req.method}_${req.route?.path || req.path}_${Date.now()}`;
  performanceMonitor.startOperation(operationId, {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent')
  });

  const originalSend = res.send;
  res.send = function(data: any) {
    performanceMonitor.markStage(operationId, 'response_sent');
    const profile = performanceMonitor.endOperation(operationId, {
      statusCode: res.statusCode,
      responseSize: data ? JSON.stringify(data).length : 0
    });
    
    // Record API request metric
    performanceMonitor.recordMetric('api_request', profile.totalDuration);
    
    return originalSend.call(this, data);
  };

  next();
}; 