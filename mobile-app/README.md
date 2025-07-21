# Rindwa Mobile - React Native App

This is the native mobile application for the Rindwa emergency reporting platform, built with React Native.

## Features

- **Emergency Incident Reporting**: Report incidents with photos, location, and priority levels
- **Real-time Incident Feed**: View community-reported incidents with upvoting
- **Emergency Contacts**: Quick access to emergency services (Police, Fire, Medical)
- **Personal Contacts**: Manage emergency contacts for family and friends
- **Multi-language Support**: English, French, and Kinyarwanda
- **Dark/Light Theme**: Automatic theme switching with user preference
- **Offline Capabilities**: Core features work offline with sync when online

## Prerequisites

- Node.js (v18 or higher)
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development on macOS)

## Installation

1. **Clone the repository and navigate to mobile-app directory**
   ```bash
   cd mobile-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install pods (iOS only)**
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Configure the API endpoint**
   - Update `API_BASE_URL` in each screen file to point to your backend server
   - Default: `http://localhost:5000/api`

## Running the App

### Development Mode

**Start Metro bundler:**
```bash
npm start
```

**Run on Android:**
```bash
npm run android
```

**Run on iOS:**
```bash
npm run ios
```

### Building for Production

**Android APK:**
```bash
npm run build:android
```

**iOS Archive:**
```bash
npm run build:ios
```

## Project Structure

```
mobile-app/
├── src/
│   ├── context/          # React Context providers
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── I18nContext.tsx
│   └── screens/          # Screen components
│       ├── SplashScreen.tsx
│       ├── OnboardingScreen.tsx
│       ├── AuthScreen.tsx
│       ├── HomeScreen.tsx
│       ├── ReportScreen.tsx
│       ├── ContactsScreen.tsx
│       └── ProfileScreen.tsx
├── App.tsx               # Main app component
├── index.js              # App entry point
├── package.json
└── metro.config.js
```

## Key Components

### Authentication
- **AuthContext**: Manages user authentication state
- **JWT Token Storage**: Secure token storage using AsyncStorage
- **Login/Registration**: Full authentication flow

### Emergency Reporting
- **Photo Capture**: Camera integration for incident evidence
- **GPS Location**: Automatic location detection
- **Priority Levels**: Critical, High, Medium, Low incident priorities
- **Real-time Sync**: Automatic sync with backend API

### Emergency Services
- **Quick Dial**: Direct calling to emergency numbers (100, 101, 102)
- **Emergency Alerts**: Backend logging of emergency service calls
- **Personal Contacts**: Emergency contact management

### Internationalization
- **Multi-language**: English, French, Kinyarwanda
- **Dynamic Translation**: Real-time language switching
- **Persistent Settings**: Language preference storage

### Theming
- **Dark/Light Mode**: Full theme support
- **System Theme**: Automatic detection of device theme
- **Custom Colors**: Rindwa branding colors (Red, White, Black)

## API Integration

The app connects to the Rindwa backend API for:

- **Authentication**: User login/registration
- **Incident Management**: CRUD operations for incidents
- **Emergency Services**: Logging emergency calls
- **Real-time Updates**: Live incident feed updates

### Key API Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/incidents/public` - Public incident feed
- `POST /api/incidents/citizen` - Citizen incident reporting
- `POST /api/incidents/:id/upvote` - Incident upvoting
- `POST /api/emergency/alert` - Emergency service alerts

## Permissions

The app requires the following permissions:

### Android
- `ACCESS_FINE_LOCATION` - GPS location access
- `CAMERA` - Camera access for photos
- `READ_EXTERNAL_STORAGE` - Photo gallery access
- `INTERNET` - Network connectivity

### iOS
- `NSLocationWhenInUseUsageDescription` - Location access
- `NSCameraUsageDescription` - Camera access
- `NSPhotoLibraryUsageDescription` - Photo library access

## Configuration

### Environment Variables
Create a `.env` file in the mobile-app directory:

```
API_BASE_URL=https://your-api-server.com/api
SENTRY_DSN=your-sentry-dsn (optional)
```

### Customization
- **Colors**: Update theme colors in `ThemeContext.tsx`
- **Branding**: Update app name and icons in `app.json`
- **API Endpoints**: Update API_BASE_URL in screen files

## Deployment

### Android Play Store
1. Generate signed APK using Android Studio
2. Upload to Play Store Console
3. Configure app details and screenshots
4. Submit for review

### iOS App Store
1. Archive app using Xcode
2. Upload to App Store Connect
3. Configure app metadata
4. Submit for review

## Troubleshooting

### Common Issues

**Metro bundler not starting:**
```bash
npx react-native start --reset-cache
```

**Android build errors:**
```bash
cd android && ./gradlew clean && cd ..
```

**iOS build errors:**
```bash
cd ios && pod install && cd ..
```

### Debug Mode
Enable debug mode in the app to see network requests and logs:
1. Shake device or press Cmd+D (iOS) / Cmd+M (Android)
2. Select "Debug" from the developer menu

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both iOS and Android
5. Submit a pull request

## License

This project is licensed under the MIT License.