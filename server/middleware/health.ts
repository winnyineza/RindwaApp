import { Request, Response } from 'express';
import { sequelize } from '../db';
import { logger } from '../utils/logger';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'healthy' | 'unhealthy';
    email: 'healthy' | 'unhealthy';
    sms: 'healthy' | 'unhealthy';
  };
  version: string;
  uptime: number;
}

export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  
  try {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        email: 'healthy',
        sms: 'healthy',
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    };

    // Check database connection
    try {
      await sequelize.authenticate();
      health.services.database = 'healthy';
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'unhealthy';
      logger.error('Database health check failed', { error: error.message });
    }

    // Check email service (SendGrid)
    try {
      const hasEmailConfig = process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL;
      health.services.email = hasEmailConfig ? 'healthy' : 'unhealthy';
      if (!hasEmailConfig) {
        logger.warn('Email service configuration missing');
      }
    } catch (error) {
      health.services.email = 'unhealthy';
      logger.error('Email service health check failed', { error: error.message });
    }

    // Check SMS service (Twilio)
    try {
      const hasSMSConfig = process.env.TWILIO_ACCOUNT_SID && 
                          process.env.TWILIO_AUTH_TOKEN && 
                          process.env.TWILIO_PHONE_NUMBER;
      health.services.sms = hasSMSConfig ? 'healthy' : 'unhealthy';
      if (!hasSMSConfig) {
        logger.warn('SMS service configuration missing');
      }
    } catch (error) {
      health.services.sms = 'unhealthy';
      logger.error('SMS service health check failed', { error: error.message });
    }

    const responseTime = Date.now() - startTime;
    
    // Log health check
    logger.info('Health check completed', {
      status: health.status,
      services: health.services,
      responseTime,
    });

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      ...health,
      responseTime,
    });
    
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      responseTime: Date.now() - startTime,
    });
  }
};

export const readinessCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if database is ready
    await sequelize.authenticate();
    
    logger.info('Readiness check passed');
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Database not ready',
    });
  }
};

export const livenessCheck = (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};