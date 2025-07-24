#!/bin/bash

# =================================================================
# 🚀 Rindwa Emergency Platform - Production Deployment Script
# =================================================================
# 
# This script automates the production deployment process
# 
# Usage: ./scripts/deploy-production.sh [options]
# 
# Options:
#   --skip-backup     Skip database backup before deployment
#   --skip-tests      Skip running tests before deployment
#   --force           Force deployment even if tests fail
#   --dry-run         Show what would be deployed without doing it
# 
# =================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/rindwa"
LOG_FILE="/var/log/rindwa/deployment_${TIMESTAMP}.log"

# Default options
SKIP_BACKUP=false
SKIP_TESTS=false
FORCE_DEPLOY=false
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--skip-backup] [--skip-tests] [--force] [--dry-run]"
            exit 1
            ;;
    esac
done

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}❌ ERROR: $1${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}✅ $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Info message
info() {
    log "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        error_exit "This script should not be run as root for security reasons"
    fi
}

# Create log directory
setup_logging() {
    sudo mkdir -p "$(dirname "$LOG_FILE")"
    sudo touch "$LOG_FILE"
    sudo chown "$(whoami):$(whoami)" "$LOG_FILE"
    info "Logging to: $LOG_FILE"
}

# Verify environment variables
check_environment() {
    info "🔍 Checking environment configuration..."
    
    local required_vars=(
        "NODE_ENV"
        "DATABASE_URL"
        "JWT_SECRET"
        "FRONTEND_URL"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        error_exit "Missing required environment variables: ${missing_vars[*]}"
    fi
    
    if [[ "$NODE_ENV" != "production" ]]; then
        error_exit "NODE_ENV must be set to 'production' for production deployment"
    fi
    
    success "Environment configuration verified"
}

# Check system dependencies
check_dependencies() {
    info "🔍 Checking system dependencies..."
    
    local required_commands=(
        "node"
        "npm"
        "psql"
        "pm2"
        "nginx"
    )
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error_exit "Required command not found: $cmd"
        fi
    done
    
    # Check Node.js version
    local node_version
    node_version=$(node --version | cut -d'v' -f2)
    local required_version="18.0.0"
    
    if ! node -e "process.exit(require('semver').gte('$node_version', '$required_version') ? 0 : 1)"; then
        error_exit "Node.js version $node_version is too old. Required: $required_version+"
    fi
    
    success "System dependencies verified"
}

# Backup database
backup_database() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        warning "Skipping database backup as requested"
        return
    fi
    
    info "💾 Creating database backup..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would create database backup"
        return
    fi
    
    local backup_file="$BACKUP_DIR/db_backup_${TIMESTAMP}.sql"
    sudo mkdir -p "$BACKUP_DIR"
    
    # Extract database details from DATABASE_URL
    local db_url="$DATABASE_URL"
    local db_name
    db_name=$(echo "$db_url" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    # Create compressed backup
    pg_dump "$DATABASE_URL" | gzip > "${backup_file}.gz"
    
    if [[ -f "${backup_file}.gz" ]]; then
        success "Database backup created: ${backup_file}.gz"
    else
        error_exit "Failed to create database backup"
    fi
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        warning "Skipping tests as requested"
        return
    fi
    
    info "🧪 Running test suite..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would run test suite"
        return
    fi
    
    cd "$PROJECT_ROOT"
    
    # Install test dependencies
    npm ci --only=dev
    
    # Run tests
    if npm test; then
        success "All tests passed"
    else
        if [[ "$FORCE_DEPLOY" == true ]]; then
            warning "Tests failed, but continuing deployment due to --force flag"
        else
            error_exit "Tests failed. Use --force to deploy anyway"
        fi
    fi
}

# Build application
build_application() {
    info "🏗️  Building application..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would build application"
        return
    fi
    
    cd "$PROJECT_ROOT"
    
    # Clean previous build
    rm -rf dist/
    
    # Install production dependencies
    npm ci --only=production
    
    # Build TypeScript
    npm run build
    
    # Verify build
    if [[ ! -f "dist/index.js" ]]; then
        error_exit "Build failed - dist/index.js not found"
    fi
    
    success "Application built successfully"
}

# Database migration
migrate_database() {
    info "🗄️  Running database migrations..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would run database migrations"
        return
    fi
    
    cd "$PROJECT_ROOT"
    
    # Run database setup/migration
    if npm run db:setup; then
        success "Database migrations completed"
    else
        error_exit "Database migrations failed"
    fi
}

# Update application files
deploy_application() {
    info "📦 Deploying application..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would deploy application files"
        return
    fi
    
    local app_dir="/var/www/rindwa"
    local backup_dir="/var/www/rindwa_backup_${TIMESTAMP}"
    
    # Create backup of current deployment
    if [[ -d "$app_dir" ]]; then
        sudo cp -r "$app_dir" "$backup_dir"
        info "Current deployment backed up to: $backup_dir"
    fi
    
    # Create app directory
    sudo mkdir -p "$app_dir"
    
    # Copy application files
    sudo cp -r "$PROJECT_ROOT"/{dist,package.json,package-lock.json} "$app_dir/"
    sudo cp -r "$PROJECT_ROOT"/public "$app_dir/" 2>/dev/null || true
    
    # Set proper ownership
    sudo chown -R "$(whoami):$(whoami)" "$app_dir"
    
    success "Application files deployed"
}

# Configure PM2
configure_pm2() {
    info "⚙️  Configuring PM2..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would configure PM2"
        return
    fi
    
    local app_dir="/var/www/rindwa"
    local ecosystem_file="$app_dir/ecosystem.config.js"
    
    # Create PM2 ecosystem file
    cat > "$ecosystem_file" << EOF
module.exports = {
    apps: [{
        name: 'rindwa-platform',
        script: 'dist/index.js',
        cwd: '$app_dir',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production',
            PORT: ${PORT:-3000}
        },
        error_file: '/var/log/rindwa/err.log',
        out_file: '/var/log/rindwa/out.log',
        log_file: '/var/log/rindwa/combined.log',
        time: true,
        max_memory_restart: '1G',
        node_args: '--max_old_space_size=2048',
        min_uptime: '10s',
        max_restarts: 10,
        autorestart: true,
        watch: false,
        ignore_watch: ['node_modules', 'logs'],
        env_production: {
            NODE_ENV: 'production'
        }
    }]
};
EOF
    
    success "PM2 configuration created"
}

# Start/restart application
restart_application() {
    info "🔄 Restarting application..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would restart application"
        return
    fi
    
    local app_dir="/var/www/rindwa"
    
    cd "$app_dir"
    
    # Stop existing application
    pm2 stop rindwa-platform 2>/dev/null || true
    pm2 delete rindwa-platform 2>/dev/null || true
    
    # Install production dependencies
    npm ci --only=production
    
    # Start application with PM2
    pm2 start ecosystem.config.js --env production
    pm2 save
    
    # Wait for application to start
    sleep 10
    
    success "Application restarted"
}

# Configure Nginx
configure_nginx() {
    info "🌐 Configuring Nginx..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would configure Nginx"
        return
    fi
    
    local nginx_config="/etc/nginx/sites-available/rindwa"
    local domain="${FRONTEND_URL#https://}"
    
    # Create Nginx configuration
    sudo tee "$nginx_config" > /dev/null << EOF
server {
    listen 80;
    server_name $domain www.$domain;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $domain www.$domain;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/rindwa.crt;
    ssl_certificate_key /etc/ssl/private/rindwa.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip Compression
    gzip on;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Static Files
    location /static/ {
        alias /var/www/rindwa/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API Proxy
    location /api/ {
        proxy_pass http://localhost:${PORT:-3000};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket Support
    location /ws {
        proxy_pass http://localhost:${PORT:-3000};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Client App
    location / {
        try_files \$uri \$uri/ /index.html;
        root /var/www/rindwa/public;
        index index.html;
        
        # Cache Control
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF
    
    # Enable site
    sudo ln -sf "$nginx_config" /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    if sudo nginx -t; then
        sudo systemctl reload nginx
        success "Nginx configured and reloaded"
    else
        error_exit "Nginx configuration test failed"
    fi
}

# Health checks
run_health_checks() {
    info "🏥 Running health checks..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would run health checks"
        return
    fi
    
    local max_attempts=30
    local attempt=1
    local health_url="${FRONTEND_URL}/health"
    
    while [[ $attempt -le $max_attempts ]]; do
        info "Health check attempt $attempt/$max_attempts..."
        
        if curl -f -s "$health_url" > /dev/null; then
            success "Health check passed"
            return
        fi
        
        sleep 10
        ((attempt++))
    done
    
    error_exit "Health checks failed after $max_attempts attempts"
}

# Cleanup old deployments
cleanup_old_deployments() {
    info "🧹 Cleaning up old deployments..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would cleanup old deployments"
        return
    fi
    
    # Keep only last 5 backups
    find /var/www -name "rindwa_backup_*" -type d | sort -r | tail -n +6 | xargs -r sudo rm -rf
    find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -type f -mtime +7 -delete 2>/dev/null || true
    
    success "Cleanup completed"
}

# Send deployment notification
send_notification() {
    info "📧 Sending deployment notification..."
    
    if [[ "$DRY_RUN" == true ]]; then
        info "[DRY RUN] Would send deployment notification"
        return
    fi
    
    local status="${1:-success}"
    local message="Rindwa Emergency Platform deployment $status at $(date)"
    
    # Send notification (implement your notification method here)
    # This could be Slack, email, Discord, etc.
    echo "$message" | logger -t "rindwa-deployment"
    
    success "Deployment notification sent"
}

# Main deployment function
main() {
    info "🚀 Starting Rindwa Emergency Platform deployment..."
    info "Timestamp: $TIMESTAMP"
    
    if [[ "$DRY_RUN" == true ]]; then
        warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Pre-deployment checks
    check_permissions
    setup_logging
    check_environment
    check_dependencies
    
    # Deployment steps
    backup_database
    run_tests
    build_application
    migrate_database
    deploy_application
    configure_pm2
    restart_application
    configure_nginx
    run_health_checks
    cleanup_old_deployments
    
    success "🎉 Deployment completed successfully!"
    send_notification "success"
    
    info "📊 Deployment Summary:"
    info "  - Timestamp: $TIMESTAMP"
    info "  - Environment: $NODE_ENV"
    info "  - Frontend URL: $FRONTEND_URL"
    info "  - Log file: $LOG_FILE"
    
    if pm2 list | grep -q "rindwa-platform"; then
        info "  - Application status: Running"
    else
        warning "  - Application status: Not running"
    fi
}

# Trap errors and send failure notification
trap 'send_notification "failed" && error_exit "Deployment failed"' ERR

# Run main function
main "$@" 