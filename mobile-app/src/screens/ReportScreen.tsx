import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  StatusBar,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { apiService, handleApiError, IncidentReport } from '../services/api';

const ReportScreen = () => {
  const { token } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'http://192.168.1.149:3000/api'; // Local backend server

  const priorities = [
    { value: 'low', label: 'Low', color: '#10b981' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'high', label: 'High', color: '#f97316' },
    { value: 'critical', label: 'Critical', color: '#ef4444' },
  ];

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to report incidents accurately.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('Permission denied', 'Location permission is required to get your current location.');
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { latitude, longitude };
        setCoordinates(coords);
        setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setShowMap(true);
        
        // Reverse geocoding to get address
        const reverseGeocode = async (lat: number, lng: number) => {
          try {
            const response = await fetch(`${API_BASE_URL}/reverse-geocode?lat=${lat}&lng=${lng}`);
            const data = await response.json();
            if (data.formatted_address) {
              setLocation(data.formatted_address);
            }
          } catch (error) {
            console.warn('Reverse geocoding failed:', error);
          }
        };
        
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.error('Error getting location:', error);
        Alert.alert('Error', 'Unable to get current location. Please enter manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera to take photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handlePhotoAction = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: chooseFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission denied', 'Camera permission is required to take photos.');
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      (response) => {
        if (response.assets && response.assets[0]) {
          setPhoto(response.assets[0].uri || null);
        }
      }
    );
  };

  const chooseFromGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      (response) => {
        if (response.assets && response.assets[0]) {
          setPhoto(response.assets[0].uri || null);
        }
      }
    );
  };

  const handleSubmit = async () => {
    if (!title || !description || !location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Use coordinates from map if available, otherwise try to parse from location text
      let locationLat: number | undefined;
      let locationLng: number | undefined;

      if (coordinates) {
        locationLat = coordinates.latitude;
        locationLng = coordinates.longitude;
      } else if (location.includes(',') && !isNaN(parseFloat(location.split(',')[0]))) {
        try {
          const coords = location.split(',');
          locationLat = parseFloat(coords[0].trim());
          locationLng = parseFloat(coords[1].trim());
        } catch (error) {
          console.warn('Could not parse coordinates:', error);
        }
      }

      const reportData: IncidentReport = {
        title,
        description,
        priority,
        location_address: location,
        location_lat: locationLat,
        location_lng: locationLng,
      };

      if (photo) {
        reportData.photo = {
          uri: photo,
          type: 'image/jpeg',
          name: 'incident-photo.jpg',
        };
      }

      const result = await apiService.submitIncidentReport(reportData);
      Alert.alert('Success', 'Incident reported successfully! Our team will review and respond appropriately.');
      console.log('Incident reported successfully:', result);
      
      // Reset form
      setTitle('');
      setDescription('');
      setLocation('');
      setCoordinates(null);
      setShowMap(false);
      setPhoto(null);
      setPriority('medium');
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>{t('report.title')}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Brief description of the incident"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{t('report.description')} *</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Detailed description of what happened"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{t('report.priority')}</Text>
            <View style={styles.priorityContainer}>
              {priorities.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.priorityButton,
                    { backgroundColor: priority === item.value ? item.color : colors.surface },
                  ]}
                  onPress={() => setPriority(item.value as any)}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: priority === item.value ? '#ffffff' : colors.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{t('report.location')} *</Text>
            <View style={styles.locationContainer}>
              <TextInput
                style={[styles.locationInput, { backgroundColor: colors.surface, color: colors.text }]}
                value={location}
                onChangeText={(text) => {
                  setLocation(text);
                  setShowMap(false);
                  setCoordinates(null);
                }}
                placeholder="Enter location or use GPS"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                style={[styles.locationButton, { backgroundColor: colors.primary }]}
                onPress={getCurrentLocation}
              >
                <Icon name="my-location" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            {showMap && coordinates && (
              <View style={styles.mapContainer}>
                <Text style={[styles.mapLabel, { color: colors.text }]}>Selected Location</Text>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  region={{
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  onPress={(event) => {
                    const { latitude, longitude } = event.nativeEvent.coordinate;
                    setCoordinates({ latitude, longitude });
                    setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                    
                    // Update address with reverse geocoding
                    const reverseGeocode = async (lat: number, lng: number) => {
                      try {
                        const response = await fetch(`${API_BASE_URL}/reverse-geocode?lat=${lat}&lng=${lng}`);
                        const data = await response.json();
                        if (data.formatted_address) {
                          setLocation(data.formatted_address);
                        }
                      } catch (error) {
                        console.warn('Reverse geocoding failed:', error);
                      }
                    };
                    reverseGeocode(latitude, longitude);
                  }}
                >
                  <Marker
                    coordinate={coordinates}
                    title="Incident Location"
                    description="Tap on the map to adjust location"
                  />
                </MapView>
                <Text style={[styles.mapHint, { color: colors.textSecondary }]}>
                  Tap on the map to adjust the incident location
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>{t('report.photo')}</Text>
            <TouchableOpacity
              style={[styles.photoButton, { backgroundColor: colors.surface }]}
              onPress={handlePhotoAction}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Icon name="add-a-photo" size={32} color={colors.textSecondary} />
                  <Text style={[styles.photoText, { color: colors.textSecondary }]}>
                    Add Photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? t('common.loading') : t('report.submit')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  textArea: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  locationInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    fontSize: 16,
    marginTop: 8,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  mapContainer: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  mapLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  map: {
    height: 200,
    width: '100%',
  },
  mapHint: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontStyle: 'italic',
  },
});

export default ReportScreen;