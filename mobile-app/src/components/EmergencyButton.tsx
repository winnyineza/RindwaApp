import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Linking,
  Platform,
  BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Geolocation from '@react-native-community/geolocation';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';

interface EmergencyButtonProps {
  onEmergencyTriggered: (location: string, coords: { lat: number; lng: number }) => void;
  style?: any;
}

const EmergencyButton: React.FC<EmergencyButtonProps> = ({ onEmergencyTriggered, style }) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [pressCount, setPressCount] = useState(0);
  const [lastPressTime, setLastPressTime] = useState(0);

  useEffect(() => {
    // Start pulsing animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Hardware button listeners
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwarePress
    );

    // Future: Volume button detection can be added with additional native modules

    return () => {
      pulse.stop();
      backHandler.remove();
    };
  }, []);

  const handleHardwarePress = () => {
    const currentTime = Date.now();
    
    // Reset count if more than 3 seconds have passed
    if (currentTime - lastPressTime > 3000) {
      setPressCount(1);
    } else {
      setPressCount(prev => prev + 1);
    }
    
    setLastPressTime(currentTime);

    // Trigger emergency on 3 rapid presses
    if (pressCount >= 2) {
      triggerEmergency();
      setPressCount(0);
      return true; // Prevent default back action
    }
    
    return false; // Allow normal back action
  };

  // Volume button handling can be implemented with additional native configuration

  const getCurrentLocation = (): Promise<{ address: string; coords: { lat: number; lng: number } }> => {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Reverse geocoding to get address
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=YOUR_MAPBOX_TOKEN`
            );
            const data = await response.json();
            const address = data.features?.[0]?.place_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            
            resolve({
              address,
              coords: { lat: latitude, lng: longitude }
            });
          } catch (error) {
            // Fallback to coordinates
            resolve({
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              coords: { lat: latitude, lng: longitude }
            });
          }
        },
        (error) => {
          console.warn('Location error:', error);
          resolve({
            address: 'Location unavailable',
            coords: { lat: 0, lng: 0 }
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  };

  const triggerEmergency = async () => {
    setIsPressed(true);
    
    try {
      const locationData = await getCurrentLocation();
      
      // Show confirmation alert
      Alert.alert(
        'Emergency Alert',
        `Emergency services will be notified of your location: ${locationData.address}\n\nThis will also call emergency services immediately.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsPressed(false),
          },
          {
            text: 'Send Emergency Alert',
            style: 'destructive',
            onPress: () => confirmEmergency(locationData),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Unable to get location for emergency alert');
      setIsPressed(false);
    }
  };

  const confirmEmergency = async (locationData: { address: string; coords: { lat: number; lng: number } }) => {
    try {
      // Trigger emergency callback
      onEmergencyTriggered(locationData.address, locationData.coords);

      // Show emergency services options
      Alert.alert(
        'Emergency Alert Sent',
        'Your emergency alert has been sent. Choose emergency service to call:',
        [
          {
            text: 'Police (100)',
            onPress: () => callEmergencyService('tel:100'),
          },
          {
            text: 'Fire (101)',
            onPress: () => callEmergencyService('tel:101'),
          },
          {
            text: 'Medical (102)',
            onPress: () => callEmergencyService('tel:102'),
          },
          {
            text: 'Close',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send emergency alert');
    } finally {
      setIsPressed(false);
    }
  };

  const callEmergencyService = (phoneNumber: string) => {
    Linking.canOpenURL(phoneNumber)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneNumber);
        } else {
          Alert.alert('Error', 'Unable to make phone call');
        }
      })
      .catch((err) => console.error('Error opening dialer:', err));
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.emergencyButton,
          { backgroundColor: isPressed ? '#b91c1c' : '#dc2626' },
        ]}
        onPress={triggerEmergency}
        activeOpacity={0.8}
        disabled={isPressed}
      >
        <Animated.View style={[styles.buttonContent, { transform: [{ scale: pulseAnim }] }]}>
          <Icon name="emergency" size={40} color="white" />
          <Text style={styles.buttonText}>EMERGENCY</Text>
          <Text style={styles.subText}>Hold to Alert</Text>
        </Animated.View>
      </TouchableOpacity>
      
      <Text style={[styles.helpText, { color: colors.text }]}>
        • Tap button for emergency alert{'\n'}
        • Triple-press back/volume buttons{'\n'}
        • Auto-calls emergency services
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  emergencyButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    borderWidth: 4,
    borderColor: 'white',
  },
  buttonContent: {
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    marginTop: 2,
  },
  helpText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 15,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
});

export default EmergencyButton;