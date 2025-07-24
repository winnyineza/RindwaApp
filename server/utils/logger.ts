import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export const logPerformance = (message: string, data?: any) => {
  logger.info(`[PERFORMANCE] ${message}`, data);
};

export const logAuditEvent = (message: string, data?: any) => {
  logger.info(`[AUDIT] ${message}`, data);
};

// Enhanced error logging function
export const logDetailedError = (context: string, error: any, additionalData?: any) => {
  const errorDetails = {
    context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      sqlState: error.parent?.code,
      sqlMessage: error.parent?.message,
      sql: error.sql,
      parameters: error.parameters,
    },
    timestamp: new Date().toISOString(),
    additionalData
  };
  
  logger.error(`[DETAILED ERROR] ${context}`, errorDetails);
  console.error(`\n🚨 DETAILED ERROR IN ${context}:`, {
    message: error.message,
    stack: error.stack?.split('\n')[0],
    sql: error.sql,
    additionalData
  });
  
  return errorDetails;
};

// API Error response helper
export const createErrorResponse = (context: string, error: any, statusCode: number = 500) => {
  const errorDetails = logDetailedError(context, error);
  
  // Return appropriate error message based on environment
  if (process.env.NODE_ENV === 'production') {
    return {
      message: 'Server error',
      errorId: errorDetails.timestamp
    };
  } else {
    return {
      message: 'Server error',
      error: error.message,
      context,
      details: process.env.NODE_ENV === 'development' ? errorDetails.error : undefined
    };
  }
};

export default logger;