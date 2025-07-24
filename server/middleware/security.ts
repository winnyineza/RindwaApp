import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger';

// Rate limiting configuration
export const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({ error: message });
    }
  });
};

// General API rate limiter - Development friendly
export const apiRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' ? 999999 : 100000, // Unlimited for dev
  'Too many requests, please try again later'
);

// Auth rate limiter - Development friendly
export const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' ? 50000 : 1000, // Much higher for dev
  'Too many login attempts, please try again later'
);

// Security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "https://api.sendgrid.com"],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5000',
      'https://localhost:5000',
      process.env.FRONTEND_URL || 'http://localhost:5000'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Input validation middleware
export const validateInput = (validations: any[] | any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // If no validations provided, just continue
      if (!validations) {
        return next();
      }

      // Handle Zod schema validation (new format)
      if (validations && validations.body && typeof validations.body.parse === 'function') {
        try {
          console.log('Using Zod validation for:', req.path);
          validations.body.parse(req.body);
          console.log('Zod validation passed for:', req.path);
          return next();
        } catch (error: any) {
          console.log('Zod validation failed for:', req.path, error.issues);
          logger.warn('Zod validation failed', {
            errors: error.errors || [error.message],
            path: req.path,
            method: req.method,
            ip: req.ip
          });
          
          return res.status(400).json({
            error: 'Validation failed',
            details: error.errors || error.issues || [{ message: error.message }]
          });
        }
      }
      
      // Handle express-validator format (legacy) - must be an array
      if (Array.isArray(validations)) {
        console.log('Using express-validator validation for:', req.path);
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Input validation failed', {
        errors: errors.array(),
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
      } else {
        // If validations is not an array and doesn't have a Zod body, it's an invalid format
        console.warn('Invalid validation format for:', req.path, 'Type:', typeof validations);
        logger.warn('Invalid validation format', {
          path: req.path,
          method: req.method,
          validationType: typeof validations,
          hasBody: !!validations.body
        });
      }

      // If we reach here, either validation passed or no validation was needed
      console.log('Validation completed for:', req.path);
    next();
    } catch (error: any) {
      console.error('Validation middleware error:', error);
      logger.error('Validation middleware error', {
        error: error.message,
        stack: error.stack,
        validations: typeof validations,
        path: req.path,
        method: req.method
      });
      
      return res.status(500).json({
        error: 'Internal validation error'
      });
    }
  };
};

// Common validation rules
export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

export const incidentValidation = [
  body('title').notEmpty().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').notEmpty().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
  body('priority').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('locationAddress').optional().trim().isLength({ max: 500 }).withMessage('Location address too long')
];

export const userValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('firstName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('First name must be 2-100 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Last name must be 2-100 characters'),
  body('phone').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Invalid phone number format'),
  body('role').isIn(['main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen']).withMessage('Invalid role')
];

// Security logging middleware
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration,
      userId: (req as any).user?.userId || null
    };
    
    if (res.statusCode >= 400) {
      logger.error('HTTP Error', logData);
    } else if (req.originalUrl.startsWith('/api/auth')) {
      logger.info('Auth Request', logData);
    } else if (res.statusCode >= 200 && res.statusCode < 300) {
      logger.info('HTTP Request', logData);
    }
  });
  
  next();
};

// Error handling middleware
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.userId || null
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
};