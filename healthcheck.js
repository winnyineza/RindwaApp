#!/usr/bin/env node

/**
 * ============================================================================
 * 🏥 Rindwa Emergency Platform - Docker Health Check
 * ============================================================================
 * Comprehensive health check script for container readiness and liveness probes
 * Validates database connectivity, API endpoints, and system resources
 */

const http = require('http');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
    port: process.env.PORT || 3000,
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
    maxResponseTime: parseInt(process.env.HEALTH_CHECK_MAX_RESPONSE_TIME) || 2000,
    maxMemoryUsage: parseInt(process.env.HEALTH_CHECK_MAX_MEMORY_MB) || 512, // MB
    endpoints: [
        '/health',
        '/ready',
        '/alive'
    ]
};

// Health check results
const healthStatus = {
    status: 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {},
    metrics: {}
};

/**
 * Log messages with timestamps
 */
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        ...(data && { data })
    };
    
    if (level === 'error') {
        console.error(JSON.stringify(logEntry));
    } else {
        console.log(JSON.stringify(logEntry));
    }
}

/**
 * Check system metrics
 */
function checkSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = {
        memory: {
            rss: Math.round(memUsage.rss / 1024 / 1024), // MB
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memUsage.external / 1024 / 1024), // MB
        },
        cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
        },
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
    };
    
    healthStatus.metrics = metrics;
    
    // Check memory usage
    const memoryOk = metrics.memory.rss < CONFIG.maxMemoryUsage;
    
    healthStatus.checks.systemMetrics = {
        status: memoryOk ? 'healthy' : 'unhealthy',
        details: {
            memoryUsage: `${metrics.memory.rss}MB / ${CONFIG.maxMemoryUsage}MB`,
            uptime: `${metrics.uptime}s`,
            nodeVersion: metrics.nodeVersion
        }
    };
    
    if (!memoryOk) {
        log('error', 'Memory usage exceeded threshold', {
            current: metrics.memory.rss,
            threshold: CONFIG.maxMemoryUsage
        });
    }
    
    return memoryOk;
}

/**
 * Check HTTP endpoint availability
 */
function checkHttpEndpoint(endpoint) {
    return new Promise((resolve) => {
        const startTime = performance.now();
        
        const req = http.request({
            hostname: 'localhost',
            port: CONFIG.port,
            path: endpoint,
            method: 'GET',
            timeout: CONFIG.timeout,
            headers: {
                'User-Agent': 'Rindwa-HealthCheck/1.0',
                'Accept': 'application/json'
            }
        }, (res) => {
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);
            
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const isHealthy = res.statusCode >= 200 && res.statusCode < 400;
                const responseTimeOk = responseTime < CONFIG.maxResponseTime;
                
                resolve({
                    endpoint,
                    status: isHealthy && responseTimeOk ? 'healthy' : 'unhealthy',
                    statusCode: res.statusCode,
                    responseTime,
                    contentLength: body.length,
                    headers: {
                        contentType: res.headers['content-type'],
                        server: res.headers['server']
                    }
                });
            });
        });
        
        req.on('error', (error) => {
            resolve({
                endpoint,
                status: 'unhealthy',
                error: error.message,
                code: error.code
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                endpoint,
                status: 'unhealthy',
                error: 'Request timeout',
                timeout: CONFIG.timeout
            });
        });
        
        req.end();
    });
}

/**
 * Check database connectivity
 */
async function checkDatabase() {
    try {
        // Dynamic import to handle potential module loading issues
        const startTime = performance.now();
        
        // Simple database connectivity test
        const testResult = await new Promise((resolve) => {
            const testProcess = require('child_process').spawn('node', ['-e', `
                const { Sequelize } = require('sequelize');
                const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
                    logging: false,
                    pool: { max: 1, min: 0, acquire: 3000, idle: 1000 }
                });
                sequelize.authenticate()
                    .then(() => { console.log('DB_OK'); process.exit(0); })
                    .catch((err) => { console.error('DB_ERROR:', err.message); process.exit(1); });
            `], {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 3000,
                env: process.env
            });
            
            let output = '';
            let errorOutput = '';
            
            testProcess.stdout.on('data', (data) => output += data.toString());
            testProcess.stderr.on('data', (data) => errorOutput += data.toString());
            
            testProcess.on('close', (code) => {
                resolve({
                    success: code === 0 && output.includes('DB_OK'),
                    output,
                    error: errorOutput,
                    code
                });
            });
            
            testProcess.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message
                });
            });
        });
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        if (testResult.success) {
            healthStatus.checks.database = {
                status: 'healthy',
                responseTime,
                details: 'Database connection successful'
            };
            return true;
        } else {
            healthStatus.checks.database = {
                status: 'unhealthy',
                responseTime,
                error: testResult.error || 'Database connection failed',
                details: testResult.output
            };
            return false;
        }
    } catch (error) {
        healthStatus.checks.database = {
            status: 'unhealthy',
            error: error.message
        };
        log('error', 'Database health check failed', error);
        return false;
    }
}

/**
 * Perform comprehensive health check
 */
async function performHealthCheck() {
    log('info', 'Starting health check', { config: CONFIG });
    
    const checks = [];
    
    // System metrics check
    checks.push(checkSystemMetrics());
    
    // Database connectivity check
    checks.push(await checkDatabase());
    
    // HTTP endpoints check
    const endpointChecks = await Promise.all(
        CONFIG.endpoints.map(endpoint => checkHttpEndpoint(endpoint))
    );
    
    endpointChecks.forEach(result => {
        healthStatus.checks[`endpoint_${result.endpoint.replace('/', '')}`] = result;
        checks.push(result.status === 'healthy');
    });
    
    // Determine overall health status
    const allHealthy = checks.every(check => check === true);
    healthStatus.status = allHealthy ? 'healthy' : 'unhealthy';
    
    // Log results
    if (allHealthy) {
        log('info', 'Health check passed', healthStatus);
        process.exit(0);
    } else {
        log('error', 'Health check failed', healthStatus);
        process.exit(1);
    }
}

/**
 * Handle graceful shutdown
 */
function handleShutdown() {
    log('info', 'Health check interrupted');
    process.exit(1);
}

// Set up signal handlers
process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log('error', 'Uncaught exception during health check', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log('error', 'Unhandled rejection during health check', { reason, promise });
    process.exit(1);
});

// Set overall timeout
setTimeout(() => {
    log('error', 'Health check timeout exceeded', { timeout: CONFIG.timeout });
    process.exit(1);
}, CONFIG.timeout);

// Start health check
performHealthCheck().catch((error) => {
    log('error', 'Health check execution failed', error);
    process.exit(1);
}); 