# 🚀 Rindwa Emergency Platform - Production Deployment Guide

This guide covers complete production deployment of the Rindwa Emergency Management Platform.

## 📋 Pre-Deployment Checklist

### ✅ **Required Services**
- [ ] PostgreSQL database server
- [ ] SendGrid or Resend email service account
- [ ] Twilio SMS service account
- [ ] Google Maps API key
- [ ] SSL certificate for HTTPS
- [ ] Domain name and DNS configuration

### ✅ **Server Requirements**
- **Minimum**: 2 CPU cores, 4GB RAM, 50GB SSD
- **Recommended**: 4 CPU cores, 8GB RAM, 100GB SSD
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **Node.js**: v18 or higher
- **PostgreSQL**: v13 or higher

---

## 🌐 **Option 1: VPS Deployment (Recommended)**

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### Step 2: Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE rindwa_production;
CREATE USER rindwa_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rindwa_production TO rindwa_user;
ALTER USER rindwa_user CREATEDB;
\q
```

### Step 3: Application Deployment

```bash
# Clone repository
git clone https://github.com/your-username/rindwa-platform.git
cd rindwa-platform

# Install dependencies
npm install

# Create production environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Production Environment Variables:**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://rindwa_user:your_secure_password@localhost:5432/rindwa_production

JWT_SECRET=your-super-secure-jwt-secret-256-bits-long
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+250788123456

GOOGLE_MAPS_API_KEY=your-google-maps-api-key
FRONTEND_URL=https://yourdomain.com

# Security
CORS_ORIGINS=https://yourdomain.com
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# File uploads
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp,application/pdf

# Backup
BACKUP_ENCRYPTION_KEY=your-backup-encryption-key
BACKUP_RETENTION_DAYS=7

# Monitoring
LOG_LEVEL=info
ENABLE_AUDIT_LOGS=true
```

### Step 4: Build and Initialize

```bash
# Setup database
npm run db:setup

# Build application
npm run build

# Test production build
npm start
```

### Step 5: PM2 Process Management

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'rindwa-platform',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=2048'
  }]
};
```

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Step 6: Nginx Reverse Proxy

Create `/etc/nginx/sites-available/rindwa`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (will be added by Certbot)
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Static files
    location /uploads {
        alias /path/to/rindwa-platform/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/rindwa /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 7: SSL Certificate

```bash
# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 8: Automated Backups

Create `/home/rindwa/backup.sh`:
```bash
#!/bin/bash

# Rindwa Platform Backup Script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/rindwa/backups"
APP_DIR="/home/rindwa/rindwa-platform"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump rindwa_production > $BACKUP_DIR/db_backup_$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz -C $APP_DIR uploads logs

# Remove backups older than 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
chmod +x /home/rindwa/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /home/rindwa/backup.sh >> /home/rindwa/backup.log 2>&1
```

---

## ☁️ **Option 2: Cloud Platform Deployment**

### Heroku Deployment

1. **Prepare for Heroku:**
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create rindwa-platform

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-jwt-secret
# ... add all other environment variables
```

2. **Deploy:**
```bash
# Deploy to Heroku
git push heroku main

# Run database setup
heroku run npm run db:setup
```

### Railway Deployment

1. **Connect Repository:**
   - Go to [Railway.app](https://railway.app)
   - Connect your GitHub repository
   - Deploy automatically

2. **Add Database:**
   - Add PostgreSQL service
   - Connect to your application

### Render Deployment

1. **Create Web Service:**
   - Connect GitHub repository
   - Set build command: `npm run build`
   - Set start command: `npm start`

2. **Add Database:**
   - Create PostgreSQL database
   - Connect via environment variables

---

## 🔍 **Monitoring & Maintenance**

### Health Monitoring

```bash
# Check application status
pm2 status

# View logs
pm2 logs rindwa-platform

# Monitor resources
pm2 monit
```

### Database Maintenance

```bash
# Vacuum and analyze database (weekly)
sudo -u postgres psql -d rindwa_production -c "VACUUM ANALYZE;"

# Check database size
sudo -u postgres psql -d rindwa_production -c "SELECT pg_size_pretty(pg_database_size('rindwa_production'));"
```

### Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
npm audit fix

# Restart application
pm2 restart rindwa-platform
```

---

## 🚨 **Troubleshooting**

### Common Issues

1. **Database Connection Errors:**
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Verify DATABASE_URL in .env file
   - Check firewall settings

2. **Permission Errors:**
   - Check file permissions: `chmod -R 755 /path/to/app`
   - Verify user ownership: `chown -R rindwa:rindwa /path/to/app`

3. **Memory Issues:**
   - Increase PM2 max memory: `max_memory_restart: '2G'`
   - Check system resources: `htop`

4. **SSL Certificate Issues:**
   - Renew certificate: `sudo certbot renew`
   - Check certificate status: `sudo certbot certificates`

### Support

For deployment support:
- **Email**: support@rindwa.com
- **Documentation**: Check `/api-docs` endpoint
- **Health Check**: Monitor `/health` endpoint

---

## ✅ **Post-Deployment Checklist**

- [ ] Application accessible via HTTPS
- [ ] Database connection working
- [ ] Email service sending messages
- [ ] SMS service working
- [ ] File uploads functioning
- [ ] WebSocket connections active
- [ ] Monitoring system active
- [ ] Backup system running
- [ ] SSL certificate auto-renewal configured
- [ ] Default admin password changed
- [ ] Security headers properly set
- [ ] API documentation accessible

**🎉 Congratulations! Your Rindwa Emergency Platform is now live in production!** 