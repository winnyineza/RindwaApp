import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { MapPin, Navigation, Search } from 'lucide-react-native';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

interface LocationServicesProps {
  onLocationSelect: (location: LocationData) => void;
  children?: React.ReactNode;
}

export const LocationServices: React.FC<LocationServicesProps> = ({
  onLocationSelect,
  children,
}) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Rindwa needs access to your location to help emergency services find you.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setHasLocationPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.warn(err);
        setHasLocationPermission(false);
      }
    } else {
      // iOS permissions are handled automatically by react-native-geolocation-service
      setHasLocationPermission(true);
    }
  };

  const getCurrentLocation = () => {
    if (!hasLocationPermission) {
      Alert.alert(
        'Permission Required',
        'Location permission is required to get your current position.',
        [{ text: 'OK', onPress: checkLocationPermission }]
      );
      return;
    }

    setIsLoading(true);

    Geolocation.getCurrentPosition(
      async (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // Get address from coordinates
        try {
          const address = await reverseGeocode(location.latitude, location.longitude);
          location.address = address;
        } catch (error) {
          console.warn('Failed to get address:', error);
          location.address = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        }

        setCurrentLocation(location);
        onLocationSelect(location);
        setIsLoading(false);
      },
      (error) => {
        setIsLoading(false);
        Alert.alert(
          'Location Error',
          'Unable to get your current location. Please check your GPS settings.',
          [{ text: 'OK' }]
        );
        console.error('Location error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    // This would typically use Google Maps Geocoding API
    // For now, return coordinates as fallback
    try {
      const response = await fetch('/api/reverse-geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lat: latitude, lng: longitude }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.address;
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }

    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.locationButton, isLoading && styles.disabledButton]}
        onPress={getCurrentLocation}
        disabled={isLoading}
      >
        <View style={styles.buttonContent}>
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Navigation size={20} color="white" />
          )}
          <Text style={styles.buttonText}>
            {isLoading ? 'Getting Location...' : 'Use Current Location'}
          </Text>
        </View>
      </TouchableOpacity>

      {currentLocation && (
        <View style={styles.locationInfo}>
          <View style={styles.locationHeader}>
            <MapPin size={16} color="#dc2626" />
            <Text style={styles.locationTitle}>Current Location</Text>
          </View>
          <Text style={styles.locationAddress}>
            {currentLocation.address || 
             `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`}
          </Text>
          <Text style={styles.coordinates}>
            Lat: {currentLocation.latitude.toFixed(6)}, 
            Lng: {currentLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  locationButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  locationAddress: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 2,
  },
  coordinates: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
});

export default LocationServices;