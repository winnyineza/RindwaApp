# Complete Local Development Setup Guide

This guide will help you run the complete Rindwa project locally including both the web admin dashboard and the React Native mobile app.

## Prerequisites

### Required Software
- **PostgreSQL 16** - Database server
- **pgAdmin4** - Database management tool
- **Node.js 18+** - JavaScript runtime
- **Git** - Version control
- **Android Studio** (for Android development) or **Xcode** (for iOS development)
- **React Native CLI** - For mobile app development

### Install React Native CLI
```bash
npm install -g react-native-cli
```

## Part 1: Database Setup

### Step 1: Create Database in pgAdmin4

1. Open **pgAdmin4**
2. Connect to your local PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database"
4. Name the database: `rindwa_local`
5. Click "Save"

### Step 2: Execute Database Setup Script

1. Right-click on the `rindwa_local` database
2. Select "Query Tool"
3. Copy the entire content from `setup-local-db.sql` file
4. Paste it into the query editor
5. Click "Execute" (or press F5)

The script will create:
- All necessary tables (users, organizations, stations, incidents, etc.)
- Sample data including 4 test users with different roles
- 2 organizations (Rwanda National Police, Rwanda Fire and Rescue)
- 3 stations (Remera Police, Nyamirambo Police, Kigali Fire Station)
- 1 sample incident for testing

## Part 2: Backend & Web Admin Setup

### Step 3: Configure Environment Variables

1. Copy `.env.local` to `.env` in the project root
2. Update your database connection:
   ```env
   DATABASE_URL=postgresql://your_username:your_password@localhost:5432/rindwa_local
   ```
3. Replace `your_username` and `your_password` with your PostgreSQL credentials
4. Generate secure secrets:
   ```env
   JWT_SECRET=your-secure-jwt-secret-here
   SESSION_SECRET=your-secure-session-secret-here
   ```

### Step 4: Install Dependencies and Start Web Application

```bash
# Install all dependencies
npm install

# Start the development server
npm run dev
```

The web admin dashboard will be available at: `http://localhost:5000`

## Part 3: Mobile App Setup

### Step 5: Set Up Mobile App Dependencies

Navigate to the mobile app directory and install dependencies:

```bash
cd mobile-app
npm install
```

### Step 6: Set Up Android Development (if using Android)

1. Install **Android Studio**
2. Set up Android SDK and emulator
3. Add Android SDK to your PATH:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

### Step 7: Set Up iOS Development (if using iOS - macOS only)

1. Install **Xcode** from App Store
2. Install Xcode command line tools:
   ```bash
   xcode-select --install
   ```
3. Install CocoaPods:
   ```bash
   sudo gem install cocoapods
   cd mobile-app/ios
   pod install
   ```

### Step 8: Configure Mobile App API Connection

Update the API configuration in `mobile-app/src/services/api.ts`:

```typescript
// For development, use your local IP address
const API_BASE_URL = 'http://YOUR_LOCAL_IP:5000/api';

// Find your local IP address:
// Windows: ipconfig
// macOS/Linux: ifconfig or ip addr show
```

**Important**: Replace `YOUR_LOCAL_IP` with your actual local IP address (e.g., `192.168.1.100`) because mobile devices/emulators need the actual IP address, not `localhost`.

### Step 9: Start Mobile App

**For Android:**
```bash
cd mobile-app

# Start Metro bundler
npm start

# In a new terminal, run on Android
npx react-native run-android
```

**For iOS (macOS only):**
```bash
cd mobile-app

# Start Metro bundler
npm start

# In a new terminal, run on iOS
npx react-native run-ios
```

## Test User Accounts

All users have the password: `password123`

- **Main Admin**: admin@rindwa.com (Full system access)
- **Super Admin**: super@police.com (Rwanda National Police admin)
- **Station Admin**: station@remera.com (Remera Police Station admin)
- **Station Staff**: nezawinnie@gmail.com (Remera Police Station staff)

## Complete System Features

### Web Admin Dashboard
- Role-based access control
- User management and invitations
- Incident management and assignment
- Analytics and reporting
- Audit logging
- Organization and station management
- Real-time notifications

### Mobile Citizen App
- Anonymous incident reporting
- Photo capture for evidence
- GPS location detection
- Emergency service contact (Police 100, Fire 101, Medical 102)
- Community incident viewing and upvoting
- Emergency alert system

## API Documentation

Once running, visit `http://localhost:5000/api-docs` for interactive API documentation.

## Troubleshooting

### Port Already in Use
```bash
# Kill processes using port 5000
lsof -ti:5000 | xargs kill -9
```

### Database Connection Issues
1. Verify PostgreSQL is running
2. Check your DATABASE_URL in .env
3. Ensure database `rindwa_local` exists
4. Verify PostgreSQL user permissions

### Mobile App Issues
1. **Metro bundler issues**: Run `npx react-native start --reset-cache`
2. **Android build issues**: Run `cd mobile-app/android && ./gradlew clean`
3. **iOS build issues**: Run `cd mobile-app/ios && pod install`
4. **API connection issues**: Ensure you're using your local IP address, not localhost

### Find Your Local IP Address
```bash
# Windows
ipconfig

# macOS
ifconfig en0 | grep inet

# Linux
ip addr show
```

## Development Workflow

1. **Start Backend**: `npm run dev` (runs on port 5000)
2. **Start Mobile App**: `cd mobile-app && npm start`
3. **Run on Device**: `npx react-native run-android` or `npx react-native run-ios`

## Production Build

### Web Application
```bash
npm run build
npm run start
```

### Mobile Application
```bash
cd mobile-app

# Android APK
npm run build:android

# iOS Archive
npm run build:ios
```

## Next Steps

1. Test all features with the provided user accounts
2. Configure SendGrid for email functionality
3. Set up Twilio for SMS alerts
4. Customize organization and station data
5. Add your own incident types and priorities
6. Test mobile app on physical devices

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify all prerequisites are installed
3. Ensure your database is running and accessible
4. Check your network connectivity for mobile app API calls

Your complete Rindwa emergency management platform is now ready for local development!