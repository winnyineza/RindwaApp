import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston about the colors
winston.addColors(colors);

// Define custom format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...extra } = info;
    
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    // Add extra data if present
    if (Object.keys(extra).length > 0) {
      logMessage += `\n${JSON.stringify(extra, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Create transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: format
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join('logs', 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  })
];

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: format,
  transports,
  exitOnError: false,
});

// Helper functions for specific log types
export const logAuth = (message: string, data?: any) => {
  logger.info(`[AUTH] ${message}`, data);
};

export const logDatabase = (message: string, data?: any) => {
  logger.info(`[DATABASE] ${message}`, data);
};

export const logSecurity = (message: string, data?: any) => {
  logger.warn(`[SECURITY] ${message}`, data);
};

export const logEmail = (message: string, data?: any) => {
  logger.info(`[EMAIL] ${message}`, data);
};

export const logSMS = (message: string, data?: any) => {
  logger.info(`[SMS] ${message}`, data);
};

export const logPerformance = (message: string, data?: any) => {
  logger.info(`[PERFORMANCE] ${message}`, data);
};

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

export default logger;