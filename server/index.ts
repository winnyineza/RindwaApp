import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import logger from "./utils/logger";
import { setupSwagger } from "./utils/swagger";
import { backupManager } from "./utils/backup";
import { 
  securityHeaders, 
  corsOptions, 
  securityLogger, 
  errorHandler,
  apiRateLimiter 
} from "./middleware/security";
import { healthCheck, readinessCheck, livenessCheck } from "./middleware/health";
import { performanceMonitor, performanceReport, memoryLeakDetector } from "./middleware/performance";
import cors from "cors";

const app = express();

// Security middleware (conditionally for production)
if (process.env.NODE_ENV === 'production') {
  app.use(securityHeaders);
  app.use(cors(corsOptions));
}
app.use(compression());

// Rate limiting
app.use('/api', apiRateLimiter);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Performance monitoring
app.use(performanceMonitor);

// Security logging
app.use(securityLogger);

// Health check endpoints (before other routes)
app.get('/health', healthCheck);
app.get('/ready', readinessCheck);
app.get('/alive', livenessCheck);

// Performance metrics endpoint
app.get('/metrics', performanceReport);

// API documentation
setupSwagger(app);

// Legacy logging middleware (keeping for compatibility)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Initialize incident escalation monitoring
    try {
      const { IncidentAssignmentService } = await import('./incidentAssignmentService');
      IncidentAssignmentService.startEscalationMonitoring();
      logger.info('🚀 Incident escalation monitoring started');
    } catch (error) {
      logger.error('Failed to start escalation monitoring:', error);
    }

    // Error handling middleware
    app.use(errorHandler);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use PORT from environment variable or default to 3000
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
      server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
      logger.info(`Rindwa server started successfully`, {
        port,
        environment: process.env.NODE_ENV || 'development',
        apiDocs: `http://localhost:${port}/api-docs`
      });
      log(`serving on port ${port}`);
    });

    // Start automated backups in production
    if (process.env.NODE_ENV === 'production') {
      backupManager.scheduleBackup(24); // Daily backups
    }

    // Start memory leak detection
    memoryLeakDetector();

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
