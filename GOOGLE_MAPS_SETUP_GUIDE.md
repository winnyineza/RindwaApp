# 🗺️ Google Maps Setup Guide

## 🚨 **Current Issue**
Your map shows: *"This page can't load Google Maps correctly"* because the Google Maps API key is missing or incorrectly configured.

## ✅ **Quick Fix - 5 Minute Setup**

### **Step 1: Get Google Maps API Key**

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create/Select Project**: 
   - Create new project or select existing
   - Name it "Rindwa Emergency Platform"
3. **Enable APIs**:
   - Go to "APIs & Services" → "Library"
   - Enable these APIs:
     - ✅ **Maps JavaScript API**
     - ✅ **Places API** 
     - ✅ **Geocoding API**
4. **Create API Key**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy your API key (looks like: `AIzaSyD...`)

### **Step 2: Configure API Key Restrictions (Important!)**

1. **Click "Restrict Key"** for security
2. **Application Restrictions**:
   - Select "HTTP referrers (web sites)"
   - Add these URLs:
     ```
     http://localhost:5174/*
     http://localhost:5173/*
     https://yourdomain.com/*
     ```
3. **API Restrictions**:
   - Select "Restrict key"
   - Choose:
     - Maps JavaScript API
     - Places API
     - Geocoding API

### **Step 3: Add API Key to Your Project**

1. **Create/Update `.env` file** in your project root:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyD...your-actual-key-here
   ```

2. **Restart your development server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

### **Step 4: Enable Billing (Required!)**

⚠️ **Important**: Google Maps requires a billing account, but includes free usage:

1. **Go to**: Billing in Google Cloud Console
2. **Create billing account** or link existing one
3. **Free Tier Includes**:
   - 28,000 map loads per month
   - 100,000 geocoding requests per month
   - More than enough for development!

## 🎯 **Alternative: Use Without Google Maps**

If you prefer not to set up Google Maps, the location picker works perfectly with the **built-in Rwanda database**:

### **Available Methods Without Google Maps:**
✅ **Search Tab** - 10+ predefined Rwanda locations  
✅ **GPS Tab** - Browser geolocation detection  
✅ **Manual Tab** - Direct coordinate input  
❌ **Map Tab** - Requires Google Maps API  

### **To Use Without Google Maps:**
1. **Don't add the API key** - system automatically uses offline mode
2. **Use Search Tab**: Type "Kigali", "Gasabo", "Remera", etc.
3. **Use GPS Tab**: Click "Use Current Location" when at station
4. **Use Manual Tab**: Enter coordinates from Google Maps website

## 🚀 **After Setup - What You'll Get**

### **Enhanced Features with Google Maps API:**
✅ **Real-time search** for any Rwanda location  
✅ **Interactive map** with click-to-select  
✅ **Professional geocoding** (address ↔ coordinates)  
✅ **Satellite/terrain view** options  
✅ **Street view** integration  
✅ **Auto-complete** as you type  

### **Example Searches That Will Work:**
- "Remera Police Station, Kigali"
- "University of Rwanda"
- "Kigali International Airport"
- "MTN Center Nyarutarama"
- "King Faisal Hospital"

## 🔧 **Troubleshooting**

### **If Map Still Shows Error:**
1. **Check API key** is correct in `.env` file
2. **Verify billing** is enabled in Google Cloud
3. **Confirm APIs** are enabled (Maps JavaScript, Places, Geocoding)
4. **Check restrictions** allow your localhost URLs
5. **Restart development server** after changes

### **If You See "For development purposes only":**
- This is normal during development
- Will disappear in production with proper domain setup

## 💰 **Cost Information**

**Free Tier (More Than Enough):**
- 28,000 map loads/month = ~900 per day
- 100,000 geocoding requests/month
- 100,000 places searches/month

**Typical Usage for Emergency Platform:**
- Creating 10 stations/month = ~50 map loads
- Station searches = ~200 requests/month
- **Total cost**: $0.00 (well within free tier)

## 🎉 **Quick Test**

After setup, test by:
1. **Go to Stations** → Create Station
2. **Click Map tab** → Should show interactive map
3. **Click anywhere** → Should set location and address
4. **Try Search tab** → Type "Kigali" → Should show multiple results

---

**Need help?** The system works perfectly without Google Maps using the Search, GPS, and Manual tabs! 🌟 