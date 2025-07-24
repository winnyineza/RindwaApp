#!/bin/bash

# =================================================================
# 🗄️ Rindwa Emergency Platform - Production Database Setup
# =================================================================
# 
# This script automates the complete database setup for production
# including schema creation, migrations, seeding, and validation
# 
# Usage: ./scripts/database/setup-production.sh [options]
# 
# Options:
#   --environment ENV    Target environment (development|staging|production)
#   --skip-backup       Skip database backup before setup
#   --seed-data         Include production seed data
#   --validate-only     Only validate database without making changes
#   --rollback          Rollback to previous database state
#   --force             Force setup even if database exists
# 
# =================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/var/log/rindwa/db_setup_${TIMESTAMP}.log"

# Default options
ENVIRONMENT="production"
SKIP_BACKUP=false
SEED_DATA=false
VALIDATE_ONLY=false
ROLLBACK=false
FORCE_SETUP=false

# Database configuration
DB_HOST=""
DB_PORT=""
DB_NAME=""
DB_USER=""
DB_PASSWORD=""
DB_URL=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --seed-data)
            SEED_DATA=true
            shift
            ;;
        --validate-only)
            VALIDATE_ONLY=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --force)
            FORCE_SETUP=true
            shift
            ;;
        --help)
            echo "Usage: $0 [--environment ENV] [--skip-backup] [--seed-data] [--validate-only] [--rollback] [--force]"
            echo ""
            echo "Options:"
            echo "  --environment ENV    Target environment (development|staging|production)"
            echo "  --skip-backup       Skip database backup before setup"
            echo "  --seed-data         Include production seed data"
            echo "  --validate-only     Only validate database without making changes"
            echo "  --rollback          Rollback to previous database state"
            echo "  --force             Force setup even if database exists"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
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
    cleanup_on_error
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

# Setup logging
setup_logging() {
    sudo mkdir -p "$(dirname "$LOG_FILE")"
    sudo touch "$LOG_FILE"
    sudo chown "$(whoami):$(whoami)" "$LOG_FILE"
    info "Database setup logging to: $LOG_FILE"
}

# Load environment configuration
load_environment() {
    local env_file=""
    
    case "$ENVIRONMENT" in
        development)
            env_file=".env.development"
            ;;
        staging)
            env_file=".env.staging"
            ;;
        production)
            env_file=".env.production"
            ;;
        *)
            env_file=".env"
            ;;
    esac
    
    if [[ -f "$PROJECT_ROOT/$env_file" ]]; then
        source "$PROJECT_ROOT/$env_file"
        info "Loaded environment from: $env_file"
    elif [[ -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
        warning "Using default .env file"
    else
        error_exit "No environment file found. Please create $env_file or .env"
    fi
    
    # Validate required environment variables
    if [[ -z "${DATABASE_URL:-}" ]]; then
        error_exit "DATABASE_URL not found in environment"
    fi
}

# Parse database URL
parse_database_url() {
    info "🔍 Parsing database connection details..."
    
    # Handle different URL formats
    if [[ $DATABASE_URL =~ ^postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+)(\?.*)?$ ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    elif [[ $DATABASE_URL =~ ^postgres://([^:]+):([^@]+)@([^:]+):([0-9]+)/([^?]+)(\?.*)?$ ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASSWORD="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
    else
        error_exit "Invalid DATABASE_URL format. Expected: postgresql://user:pass@host:port/db"
    fi
    
    DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT"
    
    info "Database Host: $DB_HOST:$DB_PORT"
    info "Database Name: $DB_NAME"
    info "Database User: $DB_USER"
}

# Check system dependencies
check_dependencies() {
    info "🔍 Checking system dependencies..."
    
    local required_commands=("psql" "pg_dump" "pg_restore" "createdb" "dropdb")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error_exit "Required command not found: $cmd. Please install PostgreSQL client tools."
        fi
    done
    
    # Check PostgreSQL server connection
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
        error_exit "Cannot connect to PostgreSQL server at $DB_HOST:$DB_PORT"
    fi
    
    success "System dependencies verified"
}

# Backup existing database
backup_database() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        warning "Skipping database backup as requested"
        return
    fi
    
    info "💾 Creating database backup..."
    
    local backup_dir="/var/backups/rindwa/db"
    local backup_file="$backup_dir/${DB_NAME}_backup_${TIMESTAMP}.sql"
    
    # Create backup directory
    sudo mkdir -p "$backup_dir"
    
    # Check if database exists before backup
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        # Create compressed backup
        PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --verbose --no-owner --no-privileges | gzip > "${backup_file}.gz"
        
        if [[ -f "${backup_file}.gz" ]]; then
            success "Database backup created: ${backup_file}.gz"
            echo "${backup_file}.gz" > "/tmp/rindwa_last_backup"
        else
            error_exit "Failed to create database backup"
        fi
    else
        info "Database $DB_NAME does not exist, skipping backup"
    fi
}

# Create database if it doesn't exist
create_database() {
    info "🏗️  Creating database if needed..."
    
    # Check if database exists
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        if [[ "$FORCE_SETUP" == true ]]; then
            warning "Database $DB_NAME exists, dropping and recreating due to --force"
            PGPASSWORD="$DB_PASSWORD" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        else
            warning "Database $DB_NAME already exists"
            return
        fi
    fi
    
    # Create database
    PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" -O "$DB_USER"
    
    if [[ $? -eq 0 ]]; then
        success "Database $DB_NAME created successfully"
    else
        error_exit "Failed to create database $DB_NAME"
    fi
}

# Install database extensions
install_extensions() {
    info "🔧 Installing database extensions..."
    
    local extensions=("uuid-ossp" "pgcrypto" "unaccent")
    
    for extension in "${extensions[@]}"; do
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"$extension\";" > /dev/null
        
        if [[ $? -eq 0 ]]; then
            success "Extension $extension installed"
        else
            warning "Failed to install extension $extension"
        fi
    done
}

# Create database schema
create_schema() {
    info "📋 Creating database schema..."
    
    local schema_file="$PROJECT_ROOT/server/database/init.sql"
    
    if [[ ! -f "$schema_file" ]]; then
        error_exit "Schema file not found: $schema_file"
    fi
    
    # Execute schema creation
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$schema_file" -v ON_ERROR_STOP=1
    
    if [[ $? -eq 0 ]]; then
        success "Database schema created successfully"
    else
        error_exit "Failed to create database schema"
    fi
}

# Run database migrations
run_migrations() {
    info "🔄 Running database migrations..."
    
    local migrations_dir="$PROJECT_ROOT/server/database/migrations"
    
    if [[ ! -d "$migrations_dir" ]]; then
        info "No migrations directory found, skipping migrations"
        return
    fi
    
    # Create migrations table if it doesn't exist
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    " > /dev/null
    
    # Run pending migrations
    local migration_count=0
    for migration_file in "$migrations_dir"/*.sql; do
        if [[ -f "$migration_file" ]]; then
            local migration_name=$(basename "$migration_file" .sql)
            
            # Check if migration already applied
            local applied=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM schema_migrations WHERE version = '$migration_name';")
            
            if [[ "$applied" == "0" ]]; then
                info "Applying migration: $migration_name"
                
                # Run migration in transaction
                PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "
                    BEGIN;
                    $(cat "$migration_file")
                    INSERT INTO schema_migrations (version) VALUES ('$migration_name');
                    COMMIT;
                "
                
                if [[ $? -eq 0 ]]; then
                    success "Migration applied: $migration_name"
                    ((migration_count++))
                else
                    error_exit "Failed to apply migration: $migration_name"
                fi
            else
                info "Migration already applied: $migration_name"
            fi
        fi
    done
    
    success "Applied $migration_count new migrations"
}

# Seed production data
seed_database() {
    if [[ "$SEED_DATA" != true ]]; then
        info "Skipping data seeding (use --seed-data to enable)"
        return
    fi
    
    info "🌱 Seeding production data..."
    
    local seed_file="$PROJECT_ROOT/server/database/seeds/production.sql"
    
    if [[ ! -f "$seed_file" ]]; then
        warning "No production seed file found: $seed_file"
        return
    fi
    
    # Execute seed data
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$seed_file" -v ON_ERROR_STOP=1
    
    if [[ $? -eq 0 ]]; then
        success "Production data seeded successfully"
    else
        error_exit "Failed to seed production data"
    fi
}

# Validate database setup
validate_database() {
    info "✅ Validating database setup..."
    
    local validation_errors=0
    
    # Check required tables exist
    local required_tables=("users" "organizations" "stations" "incidents" "invitations" "audit_logs" "notifications" "file_uploads")
    
    for table in "${required_tables[@]}"; do
        local exists=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');")
        
        if [[ "$exists" == "t" ]]; then
            success "Table exists: $table"
        else
            error_exit "Required table missing: $table"
            ((validation_errors++))
        fi
    done
    
    # Check indexes exist
    local required_indexes=("idx_users_email" "idx_incidents_status" "idx_audit_logs_user")
    
    for index in "${required_indexes[@]}"; do
        local exists=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = '$index');")
        
        if [[ "$exists" == "t" ]]; then
            success "Index exists: $index"
        else
            warning "Index missing: $index"
        fi
    done
    
    # Check database connection from application
    info "Testing application database connection..."
    cd "$PROJECT_ROOT"
    
    if node -e "
        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize('$DATABASE_URL', {
            dialect: 'postgres',
            logging: false
        });
        
        sequelize.authenticate()
            .then(() => {
                console.log('✅ Application database connection test successful');
                process.exit(0);
            })
            .catch(err => {
                console.error('❌ Application database connection test failed:', err.message);
                process.exit(1);
            });
    "; then
        success "Application database connection test passed"
    else
        error_exit "Application database connection test failed"
        ((validation_errors++))
    fi
    
    if [[ $validation_errors -eq 0 ]]; then
        success "Database validation completed successfully"
    else
        error_exit "Database validation failed with $validation_errors errors"
    fi
}

# Create database user and permissions
setup_database_user() {
    info "👤 Setting up database user and permissions..."
    
    # Check if user exists
    local user_exists=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER';")
    
    if [[ "$user_exists" != "1" ]]; then
        # Create user
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "
            CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
            ALTER ROLE $DB_USER CREATEDB;
        "
        success "Database user $DB_USER created"
    else
        info "Database user $DB_USER already exists"
    fi
    
    # Grant permissions
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "
        GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
        ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
    "
    
    success "Database permissions configured"
}

# Performance optimization
optimize_database() {
    info "⚡ Optimizing database performance..."
    
    # Update statistics
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;" > /dev/null
    
    # Vacuum for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "VACUUM;" > /dev/null
    fi
    
    success "Database optimization completed"
}

# Rollback database to previous state
rollback_database() {
    info "🔄 Rolling back database to previous state..."
    
    local backup_file=""
    if [[ -f "/tmp/rindwa_last_backup" ]]; then
        backup_file=$(cat "/tmp/rindwa_last_backup")
    else
        error_exit "No backup file found for rollback"
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        error_exit "Backup file not found: $backup_file"
    fi
    
    # Drop current database
    PGPASSWORD="$DB_PASSWORD" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    
    # Recreate database
    PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" -O "$DB_USER"
    
    # Restore from backup
    gunzip -c "$backup_file" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
    
    if [[ $? -eq 0 ]]; then
        success "Database rolled back successfully"
    else
        error_exit "Failed to rollback database"
    fi
}

# Cleanup on error
cleanup_on_error() {
    warning "Cleaning up after error..."
    
    # Remove temporary files
    rm -f "/tmp/rindwa_last_backup" 2>/dev/null || true
    
    # Log error details
    echo "Database setup failed at $(date)" >> "/var/log/rindwa/setup_errors.log"
}

# Generate database report
generate_report() {
    info "📊 Generating database setup report..."
    
    local report_file="/var/log/rindwa/db_setup_report_${TIMESTAMP}.txt"
    
    cat > "$report_file" << EOF
# Rindwa Database Setup Report
Generated: $(date)
Environment: $ENVIRONMENT
Database: $DB_NAME
Host: $DB_HOST:$DB_PORT
User: $DB_USER

## Tables Created
$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt" | grep -E "^\s+(public|)\s+\|")

## Indexes Created
$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\di" | grep -E "^\s+(public|)\s+\|")

## Database Size
$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")

## User Count
$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM users;") users

## Setup Log
See: $LOG_FILE

EOF
    
    info "Database setup report generated: $report_file"
}

# Main setup function
main() {
    info "🚀 Starting Rindwa database setup for $ENVIRONMENT environment..."
    info "Timestamp: $TIMESTAMP"
    
    # Setup logging
    setup_logging
    
    # Load environment and parse database URL
    load_environment
    parse_database_url
    
    # Check dependencies
    check_dependencies
    
    # Handle rollback option
    if [[ "$ROLLBACK" == true ]]; then
        rollback_database
        success "🎉 Database rollback completed successfully!"
        exit 0
    fi
    
    # Handle validate-only option
    if [[ "$VALIDATE_ONLY" == true ]]; then
        validate_database
        success "🎉 Database validation completed successfully!"
        exit 0
    fi
    
    # Main setup process
    backup_database
    create_database
    install_extensions
    create_schema
    run_migrations
    seed_database
    optimize_database
    validate_database
    generate_report
    
    success "🎉 Database setup completed successfully!"
    
    info "📊 Setup Summary:"
    info "  - Environment: $ENVIRONMENT"
    info "  - Database: $DB_NAME"
    info "  - Host: $DB_HOST:$DB_PORT"
    info "  - Log file: $LOG_FILE"
    info "  - Timestamp: $TIMESTAMP"
}

# Trap errors and cleanup
trap cleanup_on_error ERR

# Run main function
main "$@" 