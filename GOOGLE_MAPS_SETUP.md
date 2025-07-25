# 🗺️ Google Maps Integration Setup Guide

This guide will help you configure Google Maps across your entire Rindwa Emergency Platform - both web dashboard and mobile app.

## 🎯 Overview

Your application now uses **Google Maps everywhere**:
- ✅ **Web Dashboard**: Already configured with `@react-google-maps/api`
- ✅ **Mobile App**: Updated to use `react-native-maps` with Google Maps provider
- ✅ **Backend Routing**: Already uses Google Maps APIs for emergency routing

## 🔑 Step 1: Get Google Maps API Keys

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your **Project ID** for later use

### 1.2 Enable Required APIs

In the Google Cloud Console, enable these APIs:

**For Web Dashboard:**
- ✅ Maps JavaScript API
- ✅ Geocoding API
- ✅ Places API (Optional - for address search)

**For Mobile App:**
- ✅ Maps SDK for Android
- ✅ Maps SDK for iOS
- ✅ Geocoding API

**For Backend Routing:**
- ✅ Distance Matrix API
- ✅ Directions API

### 1.3 Create API Keys

Create **two separate API keys** for better security:

#### API Key 1: Web & Backend
```bash
# For server-side usage (no restrictions needed)
GOOGLE_MAPS_API_KEY=AIza...your-unrestricted-key
```

#### API Key 2: Mobile Apps
```bash
# For mobile apps (with bundle ID restrictions)
GOOGLE_MAPS_MOBILE_API_KEY=AIza...your-mobile-key
```

## 🌐 Step 2: Configure Web Dashboard

Your web dashboard is already configured! Just ensure you have:

### Environment Variables (.env)
```env
# Backend & Web API Key
GOOGLE_MAPS_API_KEY=AIzaSyC...your-api-key

# Frontend API Key (for web dashboard)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyC...your-api-key
```

### Verify Web Configuration
1. Start your development server: `npm run dev`
2. Visit the dashboard at `http://localhost:5000`
3. Check incident locations map and location picker

## 📱 Step 3: Configure Mobile App

### 3.1 Install Dependencies

```bash
cd RindwaExpoMobile
npm install react-native-maps
```

### 3.2 Configure API Keys

#### For Android
Edit `RindwaExpoMobile/app.json`:
```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "AIzaSyC...your-mobile-api-key"
        }
      }
    }
  }
}
```

#### For iOS
Edit `RindwaExpoMobile/app.json`:
```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "AIzaSyC...your-mobile-api-key"
      }
    }
  }
}
```

### 3.3 Platform-Specific Setup

#### Android Configuration
No additional setup needed with Expo!

#### iOS Configuration
No additional setup needed with Expo!

## 🔒 Step 4: Secure Your API Keys

### 4.1 Set API Key Restrictions

#### Web/Backend Key Restrictions:
- **Application restrictions**: HTTP referrers
- **Website restrictions**: 
  - `http://localhost:*/*` (development)
  - `https://yourdomain.com/*` (production)

#### Mobile Key Restrictions:
- **Application restrictions**: Android apps / iOS apps
- **Android**: Add your package name (`com.rindwa.emergency`)
- **iOS**: Add your bundle ID (`com.rindwa.emergency`)

### 4.2 Environment Security
```bash
# Production .env (never commit to git)
GOOGLE_MAPS_API_KEY=AIza...production-key
VITE_GOOGLE_MAPS_API_KEY=AIza...production-key

# Mobile production keys go in app.json
```

## 🧪 Step 5: Testing Your Setup

### 5.1 Test Web Dashboard
```bash
npm run dev
# Visit http://localhost:5000
# Check: Dashboard → Incidents → Map view
# Check: Create incident → Location picker
```

### 5.2 Test Mobile App
```bash
cd RindwaExpoMobile
npm start
# Scan QR code with Expo Go
# Check: Home screen → Map view
# Check: Report incident → Location picker
```

### 5.3 Test Backend Routing
```bash
node quick-google-test.cjs
node test-enhanced-routing.cjs
```

## 🚀 Step 6: Build and Deploy

### 6.1 Web Deployment
Your web dashboard is ready to deploy with Google Maps!

### 6.2 Mobile App Build

#### Android Build
```bash
cd RindwaExpoMobile
expo build:android
```

#### iOS Build
```bash
cd RindwaExpoMobile
expo build:ios
```

## 🔧 Troubleshooting

### Common Issues:

#### 1. "Maps JavaScript API" Error on Web
**Solution**: Enable Maps JavaScript API in Google Cloud Console

#### 2. "For development purposes only" watermark
**Solution**: Add billing to your Google Cloud project

#### 3. Mobile map shows blank/gray
**Solutions**:
- Check API key in `app.json`
- Verify Maps SDK for Android/iOS are enabled
- Ensure API key has mobile app restrictions

#### 4. "This API project is not authorized" error
**Solution**: 
- Check API key restrictions
- Ensure correct bundle ID/package name
- Verify the API is enabled

### Debug Commands:
```bash
# Test API key
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Kigali&key=YOUR_API_KEY"

# Check backend routing
npm run test:routing

# Verify environment variables
echo $GOOGLE_MAPS_API_KEY
```

## 📊 Feature Comparison

| Feature | Web Dashboard | Mobile App | Backend |
|---------|---------------|------------|---------|
| Interactive Map | ✅ Google Maps | ✅ Google Maps | ✅ APIs |
| Incident Locations | ✅ Markers | ✅ Markers | ✅ Routing |
| Location Picker | ✅ Draggable | ✅ Touch | ✅ Geocoding |
| Current Location | ✅ Browser API | ✅ GPS | ✅ Coordinates |
| Address Search | ✅ Places API | ✅ Geocoding | ✅ Geocoding |
| Traffic Data | ✅ Real-time | ❌ Not available | ✅ Real-time |

## 🎉 Success!

Once configured, your users will have:
- **Consistent Google Maps** across all platforms
- **Real-time traffic data** for emergency routing
- **Accurate location picking** on mobile and web
- **Professional map styling** and performance
- **Offline fallbacks** when connectivity is poor

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all API keys are correctly configured
3. Ensure billing is enabled in Google Cloud
4. Test with curl commands to verify API access

Your emergency response platform now has enterprise-grade mapping capabilities! 🚨🗺️ 