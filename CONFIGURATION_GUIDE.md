# 🔧 Rindwa Emergency Platform - Configuration Guide

This guide documents all configurable values in the Rindwa Emergency Platform, including the newly implemented dynamic configurations that replace hardcoded values.

## 🎯 Recently Fixed Hardcoded Values

The following hardcoded values have been replaced with configurable options:

### ✅ **Performance & Analytics Data**
- **Mock response time calculation**: Now uses real incident data instead of 45-minute fallback
- **Performance trends**: Now shows real performance scores instead of fake "+5.2%" values
- **Staff data**: Now fetches real staff information from database instead of mock data

### ✅ **Contact Information** 
Now configurable via environment variables:

```bash
# Support Contact Information
REACT_APP_SUPPORT_EMAIL=support@rindwa.rw
REACT_APP_SUPPORT_PHONE=+250 788 123 456
REACT_APP_SUPPORT_RESPONSE_TIME=24 hours
```

### ✅ **Incident Response Times**
Now configurable via environment variables:

```bash
# Emergency Response Times
REACT_APP_FIRE_RESPONSE_TIME=5 minutes
REACT_APP_MEDICAL_RESPONSE_TIME=3 minutes
REACT_APP_CRIMINAL_RESPONSE_TIME=15 minutes
REACT_APP_SECURITY_RESPONSE_TIME=10 minutes
```

### ✅ **Mobile App URLs**
Now uses smart configuration based on environment:

- **Development**: Automatically detects iOS (`localhost:3000`) vs Android (`10.0.2.2:3000`)
- **Production**: Uses `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WS_URL` environment variables

## 📋 Complete Environment Variables Reference

### 🌍 **Core Application**
```bash
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:3000
```

### 🗄️ **Database Configuration**
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/rindwa_emergency
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rindwa_emergency
DB_USER=username
DB_PASSWORD=password
```

### 🔐 **Security & Authentication**
```bash
JWT_SECRET=your-256-character-jwt-secret-key-here
JWT_EXPIRATION=24h
BCRYPT_ROUNDS=12
```

### 📧 **Email Services**
```bash
# Primary email service (Resend recommended)
RESEND_API_KEY=re_your_resend_api_key_here

# Fallback email service (SendGrid)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here

# Email settings
FROM_EMAIL=noreply@rindwa.com
SUPPORT_EMAIL=support@rindwa.com
```

### 📱 **SMS/Communication**
```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 🗺️ **Google Maps Integration**
```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 📞 **Contact Information (NEW - Configurable)**
```bash
REACT_APP_SUPPORT_EMAIL=support@rindwa.rw
REACT_APP_SUPPORT_PHONE=+250 788 123 456
REACT_APP_SUPPORT_RESPONSE_TIME=24 hours
```

### ⏱️ **Incident Response Times (NEW - Configurable)**
```bash
REACT_APP_FIRE_RESPONSE_TIME=5 minutes
REACT_APP_MEDICAL_RESPONSE_TIME=3 minutes
REACT_APP_CRIMINAL_RESPONSE_TIME=15 minutes
REACT_APP_SECURITY_RESPONSE_TIME=10 minutes
```

### 📱 **Mobile App Configuration (NEW - Smart URLs)**
```bash
# For production mobile app
EXPO_PUBLIC_API_URL=https://api.rindwa.com/api
EXPO_PUBLIC_WS_URL=wss://api.rindwa.com

# Development URLs are automatically handled:
# - iOS Simulator: http://localhost:3000/api
# - Android Emulator: http://10.0.2.2:3000/api
```

### 🔔 **Push Notifications**
```bash
FIREBASE_SERVER_KEY=your_firebase_server_key_here
EXPO_PUSH_TOKEN=your_expo_push_token_here
```

### 💾 **File Storage**
```bash
# AWS S3 (recommended for production)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=rindwa-uploads

# Or use local storage for development
UPLOAD_PATH=./uploads
```

### 🔧 **External Services**
```bash
# Weather API (optional)
WEATHER_API_KEY=your_weather_api_key

# Geocoding service
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

### 📊 **Monitoring & Analytics**
```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
ANALYTICS_ID=your_analytics_id
```

### 🚦 **Rate Limiting**
```bash
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000
```

### 🚨 **Emergency Contact Numbers**
```bash
EMERGENCY_POLICE=100
EMERGENCY_FIRE=101
EMERGENCY_MEDICAL=102
EMERGENCY_GENERAL=112
```

## 🚀 **Quick Setup Guide**

### For Development:
1. Copy the environment variables you need
2. Create a `.env` file in your project root
3. Set `NODE_ENV=development`
4. Mobile app URLs will automatically work with localhost

### For Production:
1. Set `NODE_ENV=production`
2. Configure all production URLs and API keys
3. Set mobile app environment variables:
   - `EXPO_PUBLIC_API_URL=https://your-domain.com/api`
   - `EXPO_PUBLIC_WS_URL=wss://your-domain.com`

## 🔒 **Security Notes**

⚠️  **Never commit real API keys to version control!**

Use secure methods for production:
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- Environment-specific CI/CD variables

## 📈 **Real Data Sources**

The following data now comes from real database queries instead of hardcoded values:

- **Station Performance Scores**: Calculated from actual resolution rates and response times
- **Response Times**: Calculated from incident assignment timestamps
- **Staff Information**: Fetched from users table with real staff data
- **Activity Feed**: Shows real incident creation, assignment, and resolution events
- **Performance Trends**: Based on actual incident processing data

## 🛠️ **Migration Notes**

If upgrading from a version with hardcoded values:

1. **Performance data** will show zeros until you have incident data
2. **Staff information** will be empty until users are assigned to stations
3. **Activity feed** will show real activities from recent incidents
4. **Contact information** will use defaults unless environment variables are set

---

**Last Updated**: January 2025  
**Version**: 2.0.0 - Real Data Implementation 