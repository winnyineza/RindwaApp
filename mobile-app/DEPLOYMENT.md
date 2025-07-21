# Rindwa Mobile App Deployment Guide

This guide covers the complete deployment process for the Rindwa React Native mobile application to both iOS App Store and Google Play Store.

## Prerequisites

### Development Environment
- **Node.js** (v18 or higher)
- **React Native CLI** (`npm install -g react-native-cli`)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development - macOS only)

### App Store Accounts
- **Apple Developer Account** ($99/year) - Required for iOS App Store
- **Google Play Developer Account** ($25 one-time fee) - Required for Google Play Store

## Pre-Deployment Setup

### 1. Update App Configuration

**Update API Base URL:**
```typescript
// In each screen file, update:
const API_BASE_URL = 'https://your-production-api.com/api';
```

**Update App Information:**
```json
// mobile-app/app.json
{
  "expo": {
    "name": "Rindwa Mobile",
    "slug": "rindwa-mobile",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.rindwa"
    },
    "android": {
      "package": "com.yourcompany.rindwa"
    }
  }
}
```

### 2. Generate App Icons and Splash Screens

**Required Assets:**
- **App Icon**: 1024x1024 PNG (for both platforms)
- **Splash Screen**: 1242x2208 PNG (various sizes needed)
- **Android Adaptive Icon**: 432x432 PNG

**Tools:**
- Use [App Icon Generator](https://appicon.co/) for multiple sizes
- Use [Splash Screen Generator](https://apetools.webprofusion.com/tools/splashscreengenerator)

## Android Deployment

### Step 1: Generate Signed APK

1. **Generate Keystore:**
   ```bash
   keytool -genkey -v -keystore rindwa-release-key.keystore -alias rindwa-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Update gradle.properties:**
   ```properties
   # android/gradle.properties
   MYAPP_RELEASE_STORE_FILE=rindwa-release-key.keystore
   MYAPP_RELEASE_KEY_ALIAS=rindwa-alias
   MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
   MYAPP_RELEASE_KEY_PASSWORD=your_key_password
   ```

3. **Build Release APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

### Step 2: Deploy to Google Play Store

1. **Create Google Play Console Account**
   - Go to [Google Play Console](https://play.google.com/console)
   - Pay $25 registration fee
   - Complete developer profile

2. **Create New App:**
   - Click "Create App"
   - Fill in app details:
     - **App Name**: Rindwa Mobile
     - **Default Language**: English
     - **App Category**: Tools/Utilities
     - **Content Rating**: Everyone

3. **Upload APK:**
   - Go to "Release" > "Production"
   - Upload the generated APK from `android/app/build/outputs/apk/release/`
   - Fill in release notes

4. **Complete Store Listing:**
   - **App Description**: Emergency incident reporting platform
   - **Screenshots**: At least 2 screenshots per screen size
   - **Feature Graphic**: 1024x500 PNG
   - **Privacy Policy**: Required (create at privacy policy generator)

5. **Submit for Review:**
   - Complete all required sections
   - Submit for review (typically 1-3 days)

## iOS Deployment

### Step 1: Configure Xcode Project

1. **Open iOS Project:**
   ```bash
   cd ios
   open RindwaMobile.xcworkspace
   ```

2. **Update Bundle Identifier:**
   - Select project in navigator
   - Update Bundle Identifier to match your domain
   - Example: `com.yourcompany.rindwa`

3. **Configure Signing:**
   - Select your development team
   - Enable "Automatically manage signing"
   - Ensure provisioning profile is valid

### Step 2: Build Archive

1. **Clean Build:**
   ```bash
   cd ios
   xcodebuild clean -workspace RindwaMobile.xcworkspace -scheme RindwaMobile
   ```

2. **Archive for Release:**
   - In Xcode: Product > Archive
   - Select "Generic iOS Device" as destination
   - Wait for archive to complete

### Step 3: Deploy to App Store

1. **Create App Store Connect Account**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Use your Apple Developer account

2. **Create New App:**
   - Click "+" and select "New App"
   - Fill in app information:
     - **Platform**: iOS
     - **Name**: Rindwa Mobile
     - **Bundle ID**: com.yourcompany.rindwa
     - **SKU**: unique identifier

3. **Upload Build:**
   - From Xcode Organizer, select your archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Upload the build

4. **Complete App Information:**
   - **App Description**: Emergency incident reporting platform
   - **Keywords**: emergency, reporting, safety, incident
   - **Screenshots**: Required for all supported devices
   - **App Review Information**: Contact details and review notes

5. **Submit for Review:**
   - Add the uploaded build to your app version
   - Submit for review (typically 1-7 days)

## Post-Deployment

### Analytics and Monitoring

1. **Firebase Analytics:**
   ```bash
   npm install @react-native-firebase/analytics
   ```

2. **Crashlytics:**
   ```bash
   npm install @react-native-firebase/crashlytics
   ```

3. **Performance Monitoring:**
   ```bash
   npm install @react-native-firebase/perf
   ```

### App Store Optimization (ASO)

**Keywords Research:**
- Emergency reporting
- Safety app
- Incident management
- Community safety
- Emergency services

**Store Listing Optimization:**
- Use keywords in title and description
- Include compelling screenshots
- Add app preview videos
- Encourage positive reviews

## Maintenance and Updates

### Version Updates

1. **Update Version Numbers:**
   ```json
   // package.json
   "version": "1.0.1"
   
   // app.json
   "version": "1.0.1"
   ```

2. **Android Version Code:**
   ```gradle
   // android/app/build.gradle
   versionCode 2
   versionName "1.0.1"
   ```

3. **iOS Version:**
   ```
   // In Xcode project settings
   Version: 1.0.1
   Build: 2
   ```

### Release Process

1. **Test thoroughly on both platforms**
2. **Update changelog and release notes**
3. **Build new versions**
4. **Submit to both stores**
5. **Monitor crash reports and user feedback**

## Troubleshooting

### Common Android Issues

**Build Errors:**
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

**Signing Issues:**
- Verify keystore path and passwords
- Check gradle.properties configuration

### Common iOS Issues

**Provisioning Profile:**
- Ensure Apple Developer account is active
- Regenerate provisioning profiles if needed

**Archive Errors:**
- Clean build folder (Cmd+Shift+K)
- Update Xcode to latest version

## Security Considerations

1. **API Security:**
   - Use HTTPS only in production
   - Implement proper authentication
   - Validate all inputs

2. **Data Protection:**
   - Encrypt sensitive data
   - Use secure storage for tokens
   - Implement proper session management

3. **Privacy Compliance:**
   - Include privacy policy
   - Request permissions properly
   - Handle user data responsibly

## Support and Maintenance

### User Support
- Monitor app store reviews
- Provide in-app support contact
- Maintain help documentation

### Performance Monitoring
- Track app performance metrics
- Monitor crash rates
- Analyze user engagement

### Regular Updates
- Security patches
- Feature enhancements
- Bug fixes
- OS compatibility updates

## Cost Breakdown

### One-time Costs
- Apple Developer Account: $99/year
- Google Play Developer Account: $25 one-time
- App Development: Variable
- App Store assets creation: $100-500

### Ongoing Costs
- Server hosting: $20-100/month
- Analytics/monitoring: $0-50/month
- Maintenance: Variable
- Marketing: Variable

## Legal Requirements

### Required Policies
- Privacy Policy
- Terms of Service
- Data Protection Compliance (GDPR if applicable)
- App Store Review Guidelines compliance

### Compliance Checklist
- [ ] Privacy policy published
- [ ] Terms of service available
- [ ] App permissions clearly explained
- [ ] Data handling practices documented
- [ ] User consent mechanisms implemented

This deployment guide provides a complete roadmap for launching your Rindwa mobile application on both major app stores. Follow each step carefully and test thoroughly before submission.