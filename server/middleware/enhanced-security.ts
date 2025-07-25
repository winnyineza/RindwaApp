/**
 * ============================================================================
 * 🛡️ Rindwa Emergency Platform - Enhanced Security Middleware
 * ============================================================================
 * Comprehensive security middleware suite for production deployment
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import validator from 'validator';
import { body, validationResult, ValidationChain } from 'express-validator';
import logger from '../utils/logger';

// Security configuration
const SECURITY_CONFIG = {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // per window
    skipSuccessfulRequests: true,
    trustProxy: true
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'ws:'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  }
};

/**
 * Enhanced Rate Limiting
 */
export const createRateLimit = (options: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipIf?: (req: Request) => boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || SECURITY_CONFIG.rateLimit.windowMs,
    max: options.maxRequests || SECURITY_CONFIG.rateLimit.maxRequests,
    message: {
      error: options.message || 'Too many requests, please try again later.',
      retryAfter: Math.ceil((options.windowMs || SECURITY_CONFIG.rateLimit.windowMs) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req: Request) => {
      return req.ip || 'unknown';
    }),
    skip: options.skipIf || (() => false),
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
      res.status(429).json({
        error: options.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil((options.windowMs || SECURITY_CONFIG.rateLimit.windowMs) / 1000)
      });
    },
    // onLimitReached: (req: Request) => {
    //   logger.error(`Rate limit threshold reached for IP: ${req.ip}`);
    // }
  });
};

// Specific rate limiters for different endpoints
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per window
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: (req: Request) => `auth:${req.ip}:${req.body?.email || 'unknown'}`
});

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // General API calls
  message: 'API rate limit exceeded, please slow down.'
});

export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // File uploads per hour
  message: 'Upload rate limit exceeded, please try again later.'
});

export const passwordResetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // Password reset attempts per hour
  message: 'Too many password reset attempts, please try again later.',
  keyGenerator: (req: Request) => `reset:${req.ip}:${req.body?.email || 'unknown'}`
});

/**
 * Enhanced CORS Configuration
 */
export const enhancedCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = SECURITY_CONFIG.cors.allowedOrigins;
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check for wildcard domains in production
    const isWildcardAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const regex = new RegExp(allowedOrigin.replace(/\*/g, '.*'));
        return regex.test(origin);
      }
      return false;
    });
    
    if (isWildcardAllowed) {
      return callback(null, true);
    }
    
    logger.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('CORS policy violation'), false);
  },
  credentials: SECURITY_CONFIG.cors.credentials,
  maxAge: SECURITY_CONFIG.cors.maxAge,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Request-ID',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ]
});

/**
 * Enhanced Helmet Security Headers
 */
export const enhancedHelmet = helmet(SECURITY_CONFIG.helmet);

/**
 * Input Validation and Sanitization
 */
export class InputValidator {
  // Email validation
  static email(): ValidationChain {
    return body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address is required')
      .custom(async (email: string) => {
        if (!validator.isEmail(email)) {
          throw new Error('Invalid email format');
        }
        return true;
      });
  }

  // Password validation
  static password(field: string = 'password'): ValidationChain {
    return body(field)
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character');
  }

  // Name validation
  static validateName(field: string): ValidationChain {
    return body(field)
      .isLength({ min: 1, max: 50 })
      .withMessage(`${field} must be between 1 and 50 characters`)
      .matches(/^[a-zA-Z\s\-'\.]+$/)
      .withMessage(`${field} can only contain letters, spaces, hyphens, apostrophes, and periods`)
      .trim()
      .escape();
  }

  // Phone validation
  static phone(): ValidationChain {
    return body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Invalid phone number format');
  }

  // URL validation
  static url(field: string): ValidationChain {
    return body(field)
      .optional()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage(`${field} must be a valid URL`);
  }

  // Geographic coordinates validation
  static coordinates() {
    return [
      body('lat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
      body('lng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180')
    ];
  }

  // Incident validation
  static incident() {
    return [
      body('title')
        .isLength({ min: 5, max: 200 })
        .withMessage('Title must be between 5 and 200 characters')
        .trim()
        .escape(),
      body('description')
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be between 10 and 2000 characters')
        .trim()
        .escape(),
      body('priority')
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Priority must be low, medium, high, or critical'),
      body('type')
        .isIn(['emergency', 'medical', 'fire', 'police', 'general'])
        .withMessage('Invalid incident type'),
      ...this.coordinates()
    ];
  }

  // User registration validation
  static userRegistration() {
    return [
      this.email(),
      this.password(),
      this.validateName('firstName'),
      this.validateName('lastName'),
      this.phone(),
      body('role')
        .optional()
        .isIn(['citizen', 'station_staff', 'station_admin', 'super_admin', 'main_admin'])
        .withMessage('Invalid user role')
    ];
  }

  // User login validation
  static userLogin() {
    return [
      this.email(),
      body('password')
        .notEmpty()
        .withMessage('Password is required')
    ];
  }
}

/**
 * Validation Error Handler
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn('Validation failed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      errors: formattedErrors,
      path: req.path
    });

    return res.status(400).json({
      error: 'Validation failed',
      details: formattedErrors
    });
  }

  next();
};

/**
 * Request Sanitization
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = validator.escape(req.query[key] as string);
      }
    });
  }

  // Add request ID for tracking
  req.headers['x-request-id'] = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  next();
};

/**
 * Security Headers Middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Request-ID', req.headers['x-request-id'] as string);
  res.setHeader('X-Powered-By', 'Rindwa Emergency Platform');
  
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

/**
 * IP Whitelisting/Blacklisting
 */
export const ipFilter = (options: {
  whitelist?: string[];
  blacklist?: string[];
  trustProxy?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = options.trustProxy ? 
      req.headers['x-forwarded-for'] as string || req.ip :
      req.ip;

    // Check blacklist first
    if (options.blacklist && options.blacklist.includes(clientIP)) {
      logger.warn(`Blocked IP from blacklist: ${clientIP}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check whitelist if defined
    if (options.whitelist && options.whitelist.length > 0) {
      if (!options.whitelist.includes(clientIP)) {
        logger.warn(`Blocked IP not in whitelist: ${clientIP}`);
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    next();
  };
};

/**
 * Anti-CSRF Protection
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API endpoints with proper authentication
  if (req.headers.authorization) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] as string;
  const sessionToken = req.session?.csrfToken;

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    logger.warn(`CSRF protection triggered for IP: ${req.ip}`);
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }

  next();
};

/**
 * Request Size Limiting
 */
export const requestSizeLimit = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const limitBytes = parseSize(limit);

    if (contentLength > limitBytes) {
      logger.warn(`Request too large: ${contentLength} bytes from IP: ${req.ip}`);
      return res.status(413).json({ 
        error: 'Request entity too large',
        maxSize: limit
      });
    }

    next();
  };
};

/**
 * Utility function to parse size strings
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) throw new Error('Invalid size format');

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.floor(value * units[unit]);
}

/**
 * Security Monitoring and Alerting
 */
export const securityMonitor = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /(\<script\>|\<\/script\>)/i, // XSS attempts
    /(union\s+select|or\s+1\s*=\s*1|drop\s+table)/i, // SQL injection
    /(\.\.\/|\.\.\%2f)/i, // Path traversal
    /(\%00|null|\0)/i, // Null byte injection
    /(eval\(|javascript:)/i // Code injection
  ];

  const userAgent = req.get('User-Agent') || '';
  const requestBody = JSON.stringify(req.body);
  const queryString = req.url;

  // Check for suspicious patterns
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(userAgent) || 
    pattern.test(requestBody) || 
    pattern.test(queryString)
  );

  if (isSuspicious) {
    logger.error('Suspicious request detected', {
      ip: req.ip,
      userAgent,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query
    });

    // Could trigger additional security measures here
    // For now, just log and continue
  }

  next();
};

/**
 * Export all security middleware
 */
export const SecurityMiddleware = {
  rateLimit: {
    auth: authRateLimit,
    api: apiRateLimit,
    upload: uploadRateLimit,
    passwordReset: passwordResetRateLimit,
    custom: createRateLimit
  },
  validation: {
    handler: handleValidationErrors,
    validators: InputValidator
  },
  headers: {
    cors: enhancedCors,
    helmet: enhancedHelmet,
    security: securityHeaders
  },
  filtering: {
    ip: ipFilter,
    csrf: csrfProtection,
    size: requestSizeLimit,
    sanitize: sanitizeRequest
  },
  monitoring: {
    security: securityMonitor
  }
}; 