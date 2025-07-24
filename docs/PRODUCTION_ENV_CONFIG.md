# 🚀 Rindwa Emergency Platform - Production Environment Configuration

This document provides comprehensive configuration for deploying the Rindwa Emergency Platform in production.

## 🔐 Security Warning

**NEVER commit real API keys or secrets to version control!** Use secure methods like:
- AWS Secrets Manager
- Azure Key Vault  
- HashiCorp Vault
- Kubernetes Secrets
- Environment-specific CI/CD variables

## 📋 Environment Variables Reference

### 🌍 Core Application Configuration

```bash
# Environment & App Configuration
NODE_ENV=production
PORT=3000
APP_NAME="Rindwa Emergency Response Platform"
APP_VERSION="1.0.0"
FRONTEND_URL=https://rindwa.yourdomain.com
API_BASE_URL=https://api.rindwa.yourdomain.com

# Deployment Information
DEPLOYED_BY="System Administrator"
DEPLOYMENT_DATE="2024-01-15T10:00:00Z"
BUILD_VERSION="prod-1.0.0-20240115"
```

### 🗄️ Database Configuration

```bash
# Production PostgreSQL Database
DATABASE_URL=postgresql://rindwa_prod_user:SECURE_PASSWORD@your-db-host.amazonaws.com:5432/rindwa_production?sslmode=require

# Database Pool Configuration
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# Database SSL Configuration
DB_SSL_REQUIRE=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

### 🔐 Security & Authentication

```bash
# JWT Secret (MUST be 256+ characters)
JWT_SECRET="your-super-secure-jwt-secret-key-minimum-256-characters-long-for-production-security"

# Session Configuration
JWT_EXPIRATION="24h"
JWT_REFRESH_EXPIRATION="7d"

# Password Security
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_SPECIAL=true

# Rate Limiting
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000

# CORS Configuration
CORS_ORIGINS="https://rindwa.yourdomain.com,https://admin.rindwa.yourdomain.com"
CORS_CREDENTIALS=true

# Security Headers
ENABLE_HELMET=true
ENABLE_AUDIT_LOGS=true
LOG_SENSITIVE_DATA=false
```

### 📧 Email Services Configuration

```bash
# Primary Email Service: Resend
RESEND_API_KEY="re_live_your_resend_api_key_here"
RESEND_FROM_EMAIL="noreply@rindwa.yourdomain.com"
RESEND_FROM_NAME="Rindwa Emergency Platform"

# Fallback Email Service: SendGrid
SENDGRID_API_KEY="SG.your_sendgrid_api_key_here"
SENDGRID_FROM_EMAIL="emergency@rindwa.yourdomain.com"
SENDGRID_FROM_NAME="Rindwa Emergency Services"

# Email Configuration
EMAIL_QUEUE_ENABLED=true
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RATE_LIMIT=100
```

### 📱 SMS Services Configuration

```bash
# Twilio SMS Service (Primary for Rwanda)
TWILIO_ACCOUNT_SID="AC_your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
TWILIO_PHONE_NUMBER="+250788123456"
TWILIO_MESSAGING_SERVICE_SID="MG_your_messaging_service_sid"

# SMS Configuration
SMS_QUEUE_ENABLED=true
SMS_RETRY_ATTEMPTS=3
SMS_RATE_LIMIT=50
SMS_MAX_LENGTH=320
```

### 🔔 Push Notifications Configuration

```bash
# Firebase Cloud Messaging
FCM_SERVER_KEY="AAAA_your_firebase_server_key"
FCM_PROJECT_ID="your-firebase-project-id"
FCM_SENDER_ID="123456789012"

# Apple Push Notifications (iOS)
APNS_KEY_ID="your_apns_key_id"
APNS_TEAM_ID="your_apple_team_id"
APNS_BUNDLE_ID="com.yourdomain.rindwa"
APNS_KEY_PATH="/path/to/AuthKey_APNS_KEY_ID.p8"
APNS_PRODUCTION=true

# Push Notification Configuration
PUSH_QUEUE_ENABLED=true
PUSH_RETRY_ATTEMPTS=3
PUSH_BATCH_SIZE=100
```

### 🗺️ Maps & Geolocation Services

```bash
# Google Maps API
GOOGLE_MAPS_API_KEY="AIza_your_google_maps_api_key"
GOOGLE_MAPS_REGION="rw"
GOOGLE_MAPS_LANGUAGE="en"
```

### 📁 File Storage & Uploads

```bash
# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES="image/jpeg,image/png,image/webp,application/pdf,video/mp4"
UPLOAD_DIRECTORY="/var/www/rindwa/uploads"

# AWS S3 Configuration
AWS_REGION="us-east-1"
AWS_S3_BUCKET="rindwa-production-files"
AWS_ACCESS_KEY_ID="AKIA_your_aws_access_key_id"
AWS_SECRET_ACCESS_KEY="your_aws_secret_access_key"
AWS_S3_ENDPOINT="https://s3.us-east-1.amazonaws.com"
```

### 📊 Analytics & Monitoring

```bash
# Application Monitoring
LOG_LEVEL="info"
LOG_FORMAT="json"
LOG_RETENTION_DAYS=30

# Error Tracking (Sentry)
SENTRY_DSN="https://your_sentry_dsn@sentry.io/project_id"
SENTRY_ENVIRONMENT="production"
SENTRY_RELEASE="1.0.0"

# Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_SAMPLE_RATE=0.1
METRICS_ENABLED=true

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_INTERVAL=30000
```

### 🔄 Backup & Disaster Recovery

```bash
# Automated Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_KEY="your-backup-encryption-key-must-be-32-characters"

# Backup Storage
BACKUP_STORAGE_TYPE="s3"
BACKUP_S3_BUCKET="rindwa-production-backups"
BACKUP_S3_REGION="us-east-1"

# Database Backup
DB_BACKUP_ENABLED=true
DB_BACKUP_COMPRESSION=true
DB_BACKUP_ENCRYPTION=true
```

### 🚀 Performance & Caching

```bash
# Redis Cache Configuration
REDIS_URL="redis://your-redis-host:6379/0"
REDIS_PASSWORD="your_redis_password"
REDIS_TLS=true

# Cache Configuration
CACHE_TTL=3600
CACHE_MAX_SIZE=100
SESSION_STORE="redis"
SESSION_SECRET="your-session-secret-key"

# CDN Configuration
CDN_ENABLED=true
CDN_URL="https://cdn.rindwa.yourdomain.com"
STATIC_FILES_CDN="https://static.rindwa.yourdomain.com"
```

## 📋 API Keys Setup Guide

### 1. 📧 Email Services

#### Resend (Recommended)
1. Visit [resend.com](https://resend.com)
2. Create account and verify domain
3. Generate API key from dashboard
4. Add `RESEND_API_KEY` to environment

#### SendGrid (Fallback)
1. Visit [sendgrid.com](https://sendgrid.com)
2. Create account and verify sender identity
3. Generate API key with full access
4. Add `SENDGRID_API_KEY` to environment

### 2. 📱 SMS Services

#### Twilio
1. Visit [twilio.com](https://twilio.com)
2. Create account and verify phone number
3. Purchase phone number in Rwanda (+250)
4. Get Account SID and Auth Token from console
5. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

### 3. 🔔 Push Notifications

#### Firebase Cloud Messaging
1. Visit [console.firebase.google.com](https://console.firebase.google.com)
2. Create new project
3. Add Android/iOS apps to project
4. Generate server key from Project Settings > Cloud Messaging
5. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
6. Add `FCM_SERVER_KEY`, `FCM_PROJECT_ID`, `FCM_SENDER_ID`

#### Apple Push Notifications (iOS)
1. Visit [developer.apple.com](https://developer.apple.com)
2. Create App ID with Push Notifications capability
3. Generate APNs Authentication Key
4. Download `.p8` key file
5. Add `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_KEY_PATH`

### 4. 🗺️ Maps Services

#### Google Maps
1. Visit [console.cloud.google.com](https://console.cloud.google.com)
2. Create project and enable Google Maps APIs:
   - Maps JavaScript API
   - Geocoding API
   - Places API
   - Directions API
3. Create API key and restrict to your domains
4. Add `GOOGLE_MAPS_API_KEY`

### 5. ☁️ Cloud Storage

#### AWS S3
1. Visit [aws.amazon.com](https://aws.amazon.com)
2. Create S3 buckets for files and backups
3. Create IAM user with S3 permissions
4. Generate access keys
5. Add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`

### 6. 📊 Monitoring Services

#### Sentry (Error Tracking)
1. Visit [sentry.io](https://sentry.io)
2. Create project for Node.js
3. Get DSN from project settings
4. Add `SENTRY_DSN`

## 🔒 Security Best Practices

### 1. API Key Security
- ✅ Use environment variables, never hardcode
- ✅ Rotate keys regularly (quarterly)
- ✅ Use minimal required permissions
- ✅ Monitor usage and set alerts
- ✅ Use secrets management services

### 2. Database Security
- ✅ Use strong passwords (20+ characters)
- ✅ Enable SSL/TLS connections
- ✅ Restrict network access
- ✅ Regular security updates
- ✅ Automated backups with encryption

### 3. Application Security
- ✅ Enable HTTPS only
- ✅ Use security headers (Helmet)
- ✅ Implement rate limiting
- ✅ Enable audit logging
- ✅ Regular dependency updates

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All API keys obtained and tested
- [ ] Database created and accessible
- [ ] SSL certificates configured
- [ ] DNS records configured
- [ ] Monitoring services setup
- [ ] Backup strategy implemented

### Deployment
- [ ] Environment variables configured
- [ ] Database migration completed
- [ ] Application built and tested
- [ ] Load balancer configured
- [ ] CDN configured
- [ ] Health checks passing

### Post-Deployment
- [ ] All services responding correctly
- [ ] Monitoring alerts configured
- [ ] Backup jobs scheduled
- [ ] Performance metrics baseline
- [ ] Security scan completed
- [ ] User acceptance testing

## 🆘 Emergency Contacts

### Service Providers
- **AWS Support**: [aws.amazon.com/support](https://aws.amazon.com/support)
- **Twilio Support**: [support.twilio.com](https://support.twilio.com)
- **Google Cloud Support**: [cloud.google.com/support](https://cloud.google.com/support)
- **SendGrid Support**: [support.sendgrid.com](https://support.sendgrid.com)

### Emergency Response
- **Police**: 100
- **Fire**: 101
- **Medical**: 102
- **General Emergency**: 112

## 📞 Technical Support

For deployment assistance, contact:
- **Email**: w.ineza@alustudent.com
- **Emergency Hotline**: +250-784-238-883

---

**Last Updated**: July 2025
**Version**: 1.0.0
**Status**: Production Ready 