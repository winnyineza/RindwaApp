import React, { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Platform,
  Vibration,
} from 'react-native';
import { useI18n } from '../context/I18nContext';
import { apiService } from '../services/api';
import Geolocation from '@react-native-community/geolocation';

interface EmergencyGestureProps {
  onEmergencyTriggered?: () => void;
}

const EmergencyGesture: React.FC<EmergencyGestureProps> = ({ onEmergencyTriggered }) => {
  const { t } = useI18n();
  const [pressCount, setPressCount] = useState(0);
  const [lastPressTime, setLastPressTime] = useState(0);
  const [isListening, setIsListening] = useState(true);

  useEffect(() => {
    if (!isListening) return;

    let backPressCount = 0;
    let volumePressCount = 0;
    let lastBackPress = 0;
    let lastVolumePress = 0;

    // Back button handler for emergency (triple press within 3 seconds)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      const currentTime = Date.now();
      
      if (currentTime - lastBackPress > 3000) {
        backPressCount = 1;
      } else {
        backPressCount++;
      }
      
      lastBackPress = currentTime;

      if (backPressCount >= 3) {
        handleEmergencyTrigger();
        backPressCount = 0;
        return true; // Prevent default back action
      }
      
      return false; // Allow normal back action for first 2 presses
    });

    // Note: Volume button detection requires additional native configuration
    // For now, we focus on back button detection which works reliably

    return () => {
      backHandler.remove();
    };
  }, [isListening]);

  const getCurrentLocation = (): Promise<{ address: string; coords: { lat: number; lng: number } }> => {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            coords: { lat: latitude, lng: longitude }
          });
        },
        (error) => {
          console.warn('Emergency location error:', error);
          resolve({
            address: 'Location unavailable',
            coords: { lat: 0, lng: 0 }
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    });
  };

  const handleEmergencyTrigger = async () => {
    try {
      // Vibrate to indicate emergency activation
      Vibration.vibrate([100, 200, 100, 200, 100]);
      
      // Disable further listening temporarily
      setIsListening(false);

      // Get current location
      const locationData = await getCurrentLocation();

      // Show confirmation alert
      Alert.alert(
        'Emergency Alert Activated',
        `Emergency services will be notified of your location: ${locationData.address}\n\nSending alert now...`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsListening(true),
          },
          {
            text: 'Send Alert',
            style: 'destructive',
            onPress: () => sendEmergencyAlert(locationData),
          },
        ]
      );
    } catch (error) {
      console.error('Emergency trigger error:', error);
      Alert.alert('Error', 'Emergency system error. Please call emergency services directly.');
      setIsListening(true);
    }
  };

  const sendEmergencyAlert = async (locationData: { address: string; coords: { lat: number; lng: number } }) => {
    try {
      // Send emergency alert to backend
      const alertData = {
        type: 'emergency_gesture',
        location: locationData.address,
        latitude: locationData.coords.lat,
        longitude: locationData.coords.lng,
        message: 'Emergency activated via hardware buttons',
        timestamp: new Date().toISOString(),
      };

      await apiService.post('/emergency/alert', alertData);

      // Also create incident report
      const incidentData = {
        title: 'EMERGENCY - Hardware Button Alert',
        description: 'Emergency alert triggered via hardware button gesture. Immediate assistance required.',
        priority: 'critical',
        location_address: locationData.address,
        location_lat: locationData.coords.lat.toString(),
        location_lng: locationData.coords.lng.toString(),
        emergency_contacts: [],
      };

      await apiService.post('/incidents/citizen', incidentData);

      Alert.alert(
        'Emergency Alert Sent',
        'Emergency services have been notified of your location. Help is on the way.',
        [
          {
            text: 'Call Emergency Services',
            onPress: () => {
              // Show emergency numbers
              Alert.alert(
                'Emergency Services',
                'Choose service to call:',
                [
                  { text: 'Police (100)', onPress: () => callEmergency('tel:100') },
                  { text: 'Fire (101)', onPress: () => callEmergency('tel:101') },
                  { text: 'Medical (102)', onPress: () => callEmergency('tel:102') },
                  { text: 'Close', style: 'cancel' },
                ]
              );
            },
          },
          {
            text: 'OK',
            onPress: () => setIsListening(true),
          },
        ]
      );

      if (onEmergencyTriggered) {
        onEmergencyTriggered();
      }
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      Alert.alert(
        'Alert Sent Locally',
        'Emergency alert processed. Please call emergency services directly for immediate assistance.',
        [
          {
            text: 'Call Now',
            onPress: () => callEmergency('tel:100'),
          },
          {
            text: 'OK',
            onPress: () => setIsListening(true),
          },
        ]
      );
    }
  };

  const callEmergency = (phoneNumber: string) => {
    const { Linking } = require('react-native');
    Linking.canOpenURL(phoneNumber)
      .then((supported: boolean) => {
        if (supported) {
          return Linking.openURL(phoneNumber);
        } else {
          Alert.alert('Error', 'Unable to make emergency call');
        }
      })
      .catch((err: any) => console.error('Error opening dialer:', err))
      .finally(() => setIsListening(true));
  };

  return null; // This component doesn't render anything visible
};

export default EmergencyGesture;