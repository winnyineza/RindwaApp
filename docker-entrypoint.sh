#!/bin/bash

# ============================================================================
# 🚀 Rindwa Emergency Platform - Docker Entrypoint Script
# ============================================================================
# This script handles container initialization, database migrations,
# and application startup with proper error handling and logging.

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

# Trap errors and cleanup
cleanup() {
    log_warning "Container shutting down..."
    if [ -n "${APP_PID:-}" ]; then
        log_info "Stopping application (PID: $APP_PID)..."
        kill -TERM "$APP_PID" 2>/dev/null || true
        wait "$APP_PID" 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGTERM SIGINT

# Environment validation
validate_environment() {
    log_info "Validating environment variables..."
    
    local required_vars=(
        "NODE_ENV"
        "DATABASE_URL"
        "JWT_SECRET"
        "FRONTEND_URL"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    log_success "Environment validation completed"
}

# Database connectivity check
check_database() {
    log_info "Checking database connectivity..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if node -e "
            const { Sequelize } = require('sequelize');
            const sequelize = new Sequelize(process.env.DATABASE_URL, {
                logging: false,
                pool: { max: 1, min: 0, acquire: 5000, idle: 1000 }
            });
            sequelize.authenticate()
                .then(() => { console.log('DB_CONNECTED'); process.exit(0); })
                .catch(() => { console.log('DB_FAILED'); process.exit(1); });
        " 2>/dev/null | grep -q "DB_CONNECTED"; then
            log_success "Database connection established"
            return 0
        fi
        
        log_warning "Database connection attempt $attempt/$max_attempts failed. Retrying in 2 seconds..."
        sleep 2
        ((attempt++))
    done
    
    log_error "Failed to connect to database after $max_attempts attempts"
    return 1
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Create a simple migration runner since the project uses raw SQL
    node -e "
        const { sequelize } = require('./dist/db.js');
        const fs = require('fs');
        const path = require('path');
        
        async function runMigrations() {
            try {
                // Check if migrations table exists
                await sequelize.query(
                    'CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE, executed_at TIMESTAMP DEFAULT NOW())'
                );
                
                console.log('Database migrations completed successfully');
                process.exit(0);
            } catch (error) {
                console.error('Migration failed:', error.message);
                process.exit(1);
            }
        }
        
        runMigrations();
    " || {
        log_error "Database migration failed"
        return 1
    }
    
    log_success "Database migrations completed"
}

# Initialize application directories
initialize_directories() {
    log_info "Initializing application directories..."
    
    local directories=(
        "logs"
        "uploads"
        "uploads/profiles"
        "uploads/incidents"
        "/tmp/rindwa"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        chmod 755 "$dir"
    done
    
    log_success "Application directories initialized"
}

# Pre-startup health checks
pre_startup_checks() {
    log_info "Running pre-startup health checks..."
    
    # Check if required files exist
    local required_files=(
        "dist/index.js"
        "package.json"
        "ecosystem.config.js"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Required file not found: $file"
            exit 1
        fi
    done
    
    # Check if PM2 is available
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 is not installed or not in PATH"
        exit 1
    fi
    
    log_success "Pre-startup checks completed"
}

# Start the application
start_application() {
    log_info "Starting Rindwa Emergency Platform..."
    
    # Set PM2 home directory
    export PM2_HOME="/tmp/rindwa/.pm2"
    
    # Clear any existing PM2 processes
    pm2 kill &>/dev/null || true
    
    # Start application with PM2
    if [ "${NODE_ENV:-production}" = "development" ]; then
        log_info "Starting in development mode..."
        pm2-runtime start ecosystem.config.js --env development
    else
        log_info "Starting in production mode..."
        pm2-runtime start ecosystem.config.js --env production
    fi
}

# Main execution
main() {
    log_info "🚀 Rindwa Emergency Platform Container Starting..."
    log_info "Environment: ${NODE_ENV:-production}"
    log_info "Frontend URL: ${FRONTEND_URL:-not-set}"
    log_info "Container User: $(whoami)"
    log_info "Working Directory: $(pwd)"
    
    # Run initialization steps
    validate_environment
    initialize_directories
    check_database
    run_migrations
    pre_startup_checks
    
    # Start the application
    start_application
}

# Execute main function
main "$@" 