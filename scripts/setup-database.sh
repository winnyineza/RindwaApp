#!/bin/bash

# Rindwa Emergency Platform - Database Setup Script
# This script sets up the PostgreSQL database for the Rindwa platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found. Please copy .env.example to .env and configure your database settings."
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL is not set in .env file"
    exit 1
fi

# Extract database connection details from DATABASE_URL
# Format: postgresql://username:password@hostname:port/database
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+)"

if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    print_error "Invalid DATABASE_URL format. Expected: postgresql://username:password@hostname:port/database"
    exit 1
fi

print_status "Database setup starting..."
print_status "Host: $DB_HOST:$DB_PORT"
print_status "Database: $DB_NAME"
print_status "User: $DB_USER"

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER > /dev/null 2>&1; then
    print_error "PostgreSQL is not running or not accessible at $DB_HOST:$DB_PORT"
    print_status "Please ensure PostgreSQL is installed and running."
    print_status "On macOS: brew services start postgresql"
    print_status "On Ubuntu: sudo systemctl start postgresql"
    exit 1
fi

print_success "PostgreSQL is running"

# Check if database exists
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME && echo "exists" || echo "not_exists")

if [ "$DB_EXISTS" = "not_exists" ]; then
    print_status "Creating database '$DB_NAME'..."
    
    # Create database
    PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
    
    if [ $? -eq 0 ]; then
        print_success "Database '$DB_NAME' created successfully"
    else
        print_error "Failed to create database '$DB_NAME'"
        exit 1
    fi
else
    print_warning "Database '$DB_NAME' already exists"
fi

# Run database initialization script
print_status "Initializing database schema..."

if [ -f "server/database/init.sql" ]; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f server/database/init.sql
    
    if [ $? -eq 0 ]; then
        print_success "Database schema initialized successfully"
    else
        print_error "Failed to initialize database schema"
        exit 1
    fi
else
    print_error "Database initialization script not found at server/database/init.sql"
    exit 1
fi

# Test database connection with application
print_status "Testing database connection..."

# Run a simple connection test using Node.js
node -e "
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('$DATABASE_URL', {
  dialect: 'postgres',
  logging: false
});

sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection test successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection test failed:', err.message);
    process.exit(1);
  });
"

if [ $? -eq 0 ]; then
    print_success "Database connection test passed"
else
    print_error "Database connection test failed"
    exit 1
fi

# Display setup completion
print_success "Database setup completed successfully!"
print_status ""
print_status "You can now start the development server with:"
print_status "  npm run dev"
print_status ""
print_status "Default admin credentials:"
print_status "  Email: admin@rindwa.com"
print_status "  Password: admin123"
print_status ""
print_warning "IMPORTANT: Change the default admin password immediately in production!"
print_status "" 