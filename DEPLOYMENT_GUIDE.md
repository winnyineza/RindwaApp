# Rindwa Platform Deployment Guide

This guide provides comprehensive instructions for deploying the Rindwa Emergency Management Platform to production environments.

##  Quick Start

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 12 or higher
- SSL certificate for HTTPS
- Domain name (recommended)

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure all required environment variables
3. Set up database and email services
4. Configure SSL certificates

## 📋 Deployment Options

### Option 1: VPS Deployment (Recommended)

#### Server Requirements
- **CPU**: 2 cores minimum, 4+ cores recommended
- **RAM**: 4GB minimum, 8GB+ recommended
- **Storage**: 50GB SSD minimum
- **Network**: 100Mbps+ bandwidth
- **OS**: Ubuntu 20.04 LTS or similar

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx (optional, for reverse proxy)
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Database Setup
```bash
# Create database user and database
sudo -u postgres createuser --interactive
sudo -u postgres createdb rindwa_production

# Set password for database user
sudo -u postgres psql
ALTER USER rindwa_user PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rindwa_production TO rindwa_user;
\q
```

#### 3. Application Deployment
```bash
# Clone repository
git clone https://github.com/your-username/rindwa-platform.git
cd rindwa-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with production values

# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 4. Nginx Configuration
```nginx
# /etc/nginx/sites-available/rindwa
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    # Main location
    location / {
        proxy_pass http://localhost:5000;
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
    
    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Login rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health checks
    location /health {
        access_log off;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://localhost:5000;
    }
}
```

#### 5. SSL Certificate Setup
```bash
# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test renewal
sudo certbot renew --dry-run

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### 6. Firewall Configuration
```bash
# Configure UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Check status
sudo ufw status
```

### Option 2: Platform-as-a-Service (PaaS)

#### Heroku Deployment
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
heroku config:set SENDGRID_API_KEY=your-sendgrid-key
heroku config:set SENDGRID_FROM_EMAIL=admin@yourdomain.com

# Deploy
git push heroku main
```

#### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway new

# Add PostgreSQL
railway add postgresql

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-jwt-secret

# Deploy
railway up
```

### Option 3: Container Deployment

#### Docker Setup
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/rindwa
      - JWT_SECRET=your-jwt-secret
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=rindwa
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

## 🔧 Environment Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
JWT_SECRET=your-secure-jwt-secret-key

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=admin@yourdomain.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
```

### Optional Environment Variables
```env
# Logging
LOG_LEVEL=info

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Performance
CACHE_TTL_MS=300000
DB_POOL_SIZE=20

# Backup
BACKUP_RETENTION_DAYS=7
BACKUP_SCHEDULE_HOURS=24
```

## 🔐 Security Configuration

### 1. Database Security
```sql
-- Create read-only user for monitoring
CREATE USER monitor WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE rindwa TO monitor;
GRANT USAGE ON SCHEMA public TO monitor;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitor;

-- Create backup user
CREATE USER backup WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE rindwa TO backup;
GRANT USAGE ON SCHEMA public TO backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup;
```

### 2. Application Security
- Use strong JWT secrets (32+ characters)
- Enable HTTPS with valid SSL certificates
- Configure security headers
- Set up rate limiting
- Enable audit logging

### 3. Server Security
```bash
# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Configure fail2ban
sudo apt install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Set up automatic updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

##  Monitoring & Logging

### 1. Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart rindwa-platform
```

### 2. Health Checks
- **Liveness**: `GET /alive`
- **Readiness**: `GET /ready`
- **Health**: `GET /health`
- **Metrics**: `GET /metrics`

### 3. Log Management
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/rindwa

# Content:
/path/to/rindwa/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 app app
    postrotate
        pm2 reload rindwa-platform
    endscript
}
```

##  Backup Strategy

### 1. Database Backups
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
gzip backup_$DATE.sql

# Upload to cloud storage (optional)
aws s3 cp backup_$DATE.sql.gz s3://your-backup-bucket/
```

### 2. Application Backups
```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Backup configuration
cp .env .env.backup.$(date +%Y%m%d)
```

### 3. Automated Backups
```bash
# Add to crontab
0 2 * * * /path/to/backup_script.sh
```

## 🚦 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database set up and migrated
- [ ] SSL certificates installed
- [ ] Domain DNS configured
- [ ] Email service configured
- [ ] SMS service configured
- [ ] Backup strategy implemented

### Post-Deployment
- [ ] Health checks passing
- [ ] SSL certificate valid
- [ ] Database connectivity confirmed
- [ ] Email notifications working
- [ ] SMS alerts working
- [ ] Monitoring set up
- [ ] Backup jobs running
- [ ] Performance metrics normal

### Security Checks
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Firewall configured
- [ ] Database access restricted
- [ ] Log monitoring active
- [ ] Intrusion detection enabled

## 🔍 Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Check database status
sudo systemctl status postgresql

# Check connection
psql $DATABASE_URL -c "SELECT 1"

# Check logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### 2. Application Crashes
```bash
# Check PM2 status
pm2 status

# View error logs
pm2 logs --error

# Restart application
pm2 restart rindwa-platform
```

#### 3. SSL Issues
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL
curl -I https://yourdomain.com
```

#### 4. Performance Issues
```bash
# Check system resources
htop
df -h
free -h

# Check application metrics
curl https://yourdomain.com/metrics

# Monitor database
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity"
```

## 📞 Support

### Getting Help
- **Documentation**: Check README.md and API docs
- **Health Status**: Monitor `/health` endpoint
- **Logs**: Review application and system logs
- **Community**: GitHub discussions and issues

### Emergency Contacts
- **Technical Support**: tech@rindwa.com
- **Security Issues**: security@rindwa.com
- **Emergency**: +1-XXX-XXX-XXXX

##  Updates & Maintenance

### Regular Updates
```bash
# Update dependencies
npm update

# Security updates
npm audit fix

# System updates
sudo apt update && sudo apt upgrade

# Rebuild application
npm run build
pm2 restart rindwa-platform
```

### Maintenance Schedule
- **Daily**: Check health metrics
- **Weekly**: Review logs and performance
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **Annually**: Full system review

This deployment guide provides a comprehensive foundation for deploying the Rindwa platform to production. Adjust configurations based on your specific requirements and infrastructure.