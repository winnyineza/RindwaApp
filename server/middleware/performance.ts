import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  userId?: number;
}

const activeRequests = new Map<string, PerformanceMetrics>();

export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  // Store initial metrics
  const metrics: PerformanceMetrics = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    startTime,
    memoryUsage: process.memoryUsage(),
  };
  
  activeRequests.set(requestId, metrics);
  
  // Add request ID to request for tracking
  (req as any).requestId = requestId;
  
  // Monitor response
  res.on('finish', () => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.statusCode = res.statusCode;
    metrics.userId = (req as any).user?.userId;
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        duration,
        statusCode: res.statusCode,
        userId: metrics.userId,
      });
    }
    
    // Log performance metrics
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      duration,
      statusCode: res.statusCode,
      memoryUsage: process.memoryUsage(),
    });
    
    // Cleanup
    activeRequests.delete(requestId);
  });
  
  next();
};

export const getPerformanceMetrics = () => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    activeRequests: activeRequests.size,
    nodeVersion: process.version,
  };
};

export const performanceReport = (req: Request, res: Response) => {
  const metrics = getPerformanceMetrics();
  
  // Add database connection info if available
  try {
    const dbMetrics = {
      connectionCount: 0, // Would be set by database pool
      queryCount: 0,     // Would be tracked by query interceptor
    };
    
    res.json({
      ...metrics,
      database: dbMetrics,
    });
  } catch (error) {
    logger.error('Failed to get performance metrics', {
      error: error.message,
    });
    
    res.status(500).json({
      error: 'Failed to get performance metrics',
    });
  }
};

// Memory leak detection
export const memoryLeakDetector = () => {
  const initialMemory = process.memoryUsage();
  
  setInterval(() => {
    const currentMemory = process.memoryUsage();
    const heapGrowth = currentMemory.heapUsed - initialMemory.heapUsed;
    
    // Alert if heap has grown by more than 100MB
    if (heapGrowth > 100 * 1024 * 1024) {
      logger.warn('Potential memory leak detected', {
        initialHeapUsed: initialMemory.heapUsed,
        currentHeapUsed: currentMemory.heapUsed,
        heapGrowth,
        activeRequests: activeRequests.size,
      });
    }
  }, 60000); // Check every minute
};

// Request timeout middleware
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.error('Request timeout', {
          method: req.method,
          url: req.originalUrl,
          timeout: timeoutMs,
          requestId: (req as any).requestId,
        });
        
        res.status(408).json({
          error: 'Request timeout',
          timeout: timeoutMs,
        });
      }
    }, timeoutMs);
    
    res.on('finish', () => {
      clearTimeout(timeout);
    });
    
    next();
  };
};