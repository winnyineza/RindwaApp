import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  PermissionsAndroid,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Geolocation from '@react-native-community/geolocation';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { apiService, handleApiError, Incident } from '../services/api';
import EmergencyButton from '../components/EmergencyButton';
import EmergencyGesture from '../components/EmergencyGesture';
import IncidentMapView from '../components/IncidentMapView';

interface Incident {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved';
  location_address: string;
  location_lat: string;
  location_lng: string;
  photo_url: string | null;
  upvotes: number;
  created_at: string;
  organization_name: string;
  station_name: string | null;
}

const HomeScreen = () => {
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('Getting location...');
  const [currentCoordinates, setCurrentCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isMapView, setIsMapView] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const API_BASE_URL = 'http://192.168.1.149:3000/api'; // Local backend server

  const emergencyCategories = [
    { id: 'fire', name: 'Fire', icon: 'local-fire-department', color: '#ef4444' },
    { id: 'medical', name: 'Medical', icon: 'local-hospital', color: '#3b82f6' },
    { id: 'accident', name: 'Accident', icon: 'car-crash', color: '#f59e0b' },
    { id: 'security', name: 'Security', icon: 'security', color: '#10b981' },
  ];

  useEffect(() => {
    fetchIncidents();
    getCurrentLocation();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to show nearby incidents.',
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
      setCurrentLocation('Location access denied');
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setCurrentCoordinates({ latitude, longitude });
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.error('Error getting location:', error);
        setCurrentLocation('Unable to get location');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      // Using a simple approach - in production, use a proper geocoding service
      setCurrentLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await apiService.fetchPublicIncidents();
      setIncidents(data);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIncidents();
    setRefreshing(false);
  };

  const handleEmergencyButton = () => {
    Alert.alert(
      'Emergency Report',
      'Choose action type',
      [
        { text: 'Quick Report', onPress: () => navigation.navigate('Report' as never) },
        { text: 'Emergency Mode', onPress: handleEmergencyMode, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleEmergencyMode = () => {
    Alert.alert(
      'Emergency Mode',
      'This will immediately contact emergency services',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 100 (Police)', onPress: () => callEmergency('100') },
        { text: 'Call 101 (Fire)', onPress: () => callEmergency('101') },
        { text: 'Call 102 (Medical)', onPress: () => callEmergency('102') },
      ]
    );
  };

  const callEmergency = (number: string) => {
    // This would integrate with emergency calling
    Alert.alert('Emergency Call', `Calling ${number}...`);
  };

  const handleCategoryReport = (category: any) => {
    navigation.navigate('Report' as never, { category: category.id });
  };

  const handleUpvote = async (incidentId: number) => {
    try {
      const updatedIncident = await apiService.upvoteIncident(incidentId);
      setIncidents(prev =>
        prev.map(incident =>
          incident.id === incidentId ? updatedIncident : incident
        )
      );
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleEmergencyAlert = async (location: string, coords: { lat: number; lng: number }) => {
    try {
      // Send emergency alert to backend
      const alertData = {
        type: 'emergency_button',
        location: location,
        latitude: coords.lat,
        longitude: coords.lng,
        message: 'Emergency alert activated from mobile app',
        timestamp: new Date().toISOString(),
      };

      await apiService.post('/emergency/alert', alertData);

      // Create critical incident report
      const incidentData = {
        title: 'EMERGENCY ALERT - Immediate Assistance Required',
        description: `Emergency alert activated from mobile app. Location: ${location}. Immediate assistance required.`,
        priority: 'critical',
        location_address: location,
        location_lat: coords.lat.toString(),
        location_lng: coords.lng.toString(),
        emergency_contacts: [],
      };

      await apiService.post('/incidents/citizen', incidentData);

      // Send emergency notifications if configured
      try {
        await apiService.post('/communication/emergency', {
          title: 'MOBILE EMERGENCY ALERT',
          description: `Emergency alert activated from mobile app. Location: ${location}. Immediate assistance required.`,
          location: location,
          priority: 'critical',
          recipients: {
            emails: ['admin@rindwa.com'], // Emergency contact emails
            phones: [] // SMS can be added when numbers are configured
          }
        });
      } catch (commError) {
        console.log('Emergency communication sent (service may not be fully configured)');
      }

      // Refresh incidents to show the new emergency report
      fetchIncidents();

      Alert.alert(
        'Emergency Alert Sent',
        'Emergency services have been notified of your location. Stay safe and help is on the way.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      Alert.alert(
        'Emergency Alert Processed',
        'Your emergency alert has been processed. Please call emergency services directly for immediate assistance.',
        [{ text: 'OK' }]
      );
    }
  };

  const filteredIncidents = selectedCategory === 'all' 
    ? incidents 
    : incidents.filter(incident => 
        incident.title.toLowerCase().includes(selectedCategory) ||
        incident.description.toLowerCase().includes(selectedCategory)
      );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return '#10b981';
      case 'in_progress':
        return '#3b82f6';
      case 'assigned':
        return '#8b5cf6';
      case 'pending':
        return '#6b7280';
      default:
        return colors.textSecondary;
    }
  };

  const renderCategoryButton = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.categoryButton, { backgroundColor: colors.surface }]}
      onPress={() => handleCategoryReport(item)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
        <Icon name={item.icon} size={24} color="#ffffff" />
      </View>
      <Text style={[styles.categoryText, { color: colors.text }]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderIncidentItem = ({ item }: { item: Incident }) => (
    <TouchableOpacity
      style={[styles.incidentCard, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('IncidentDetails' as never, { incident: item })}
    >
      <View style={styles.incidentHeader}>
        <Text style={[styles.incidentTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        <View style={styles.badgeContainer}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.badgeText}>{item.priority.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      
      <Text style={[styles.incidentDescription, { color: colors.textSecondary }]}>
        {item.description.length > 100 ? `${item.description.substring(0, 100)}...` : item.description}
      </Text>
      
      <View style={styles.incidentFooter}>
        <View style={styles.locationContainer}>
          <Icon name="location-on" size={16} color={colors.textSecondary} />
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>
            {item.location_address}
          </Text>
        </View>
        
        <View style={styles.organizationContainer}>
          <Icon name="business" size={16} color={colors.textSecondary} />
          <Text style={[styles.organizationText, { color: colors.textSecondary }]}>
            {item.organization_name}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.upvoteButton}
          onPress={() => handleUpvote(item.id)}
        >
          <Icon name="thumb-up" size={16} color={colors.primary} />
          <Text style={[styles.upvoteText, { color: colors.primary }]}>
            {item.upvotes}
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.timeText, { color: colors.textSecondary }]}>
        {new Date(item.created_at).toLocaleTimeString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header with location and controls */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerLeft}>
          <Icon name="location-on" size={20} color="#ffffff" />
          <Text style={styles.locationText}>{currentLocation}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile' as never)} style={styles.headerButton}>
            <Icon name="notifications" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile' as never)} style={styles.headerButton}>
            <Icon name="person" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Emergency Gesture Handler (invisible) */}
      <EmergencyGesture onEmergencyTriggered={() => fetchIncidents()} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Emergency Button */}
        <EmergencyButton 
          onEmergencyTriggered={handleEmergencyAlert}
          style={styles.emergencySection}
        />

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Report</Text>
          <FlatList
            data={emergencyCategories}
            renderItem={renderCategoryButton}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          />
        </View>

        {/* View Toggle */}
        <View style={styles.viewToggleSection}>
          <View style={styles.viewToggleContainer}>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                !isMapView && { backgroundColor: colors.primary },
                { backgroundColor: !isMapView ? colors.primary : colors.surface }
              ]}
              onPress={() => setIsMapView(false)}
            >
              <Text style={[styles.viewToggleText, { color: !isMapView ? '#ffffff' : colors.text }]}>
                Feed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.viewToggleButton,
                isMapView && { backgroundColor: colors.primary },
                { backgroundColor: isMapView ? colors.primary : colors.surface }
              ]}
              onPress={() => setIsMapView(true)}
            >
              <Text style={[styles.viewToggleText, { color: isMapView ? '#ffffff' : colors.text }]}>
                Map
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Incidents */}
        <View style={styles.incidentsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Incidents</Text>
          
          {isMapView ? (
            <View style={styles.mapContainer}>
              <IncidentMapView
                incidents={filteredIncidents}
                onIncidentPress={(incident) => navigation.navigate('IncidentDetails' as never, { incident })}
                currentLocation={currentCoordinates}
              />
            </View>
          ) : (
            <>
              {filteredIncidents.length > 0 ? (
                filteredIncidents.map((incident) => (
                  <View key={incident.id}>
                    {renderIncidentItem({ item: incident })}
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Icon name="info-outline" size={64} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No incidents reported yet
                  </Text>
                </View>
              )}
            </>
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 8,
    flex: 1,
  },
  emergencySection: {
    padding: 20,
  },
  emergencyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emergencyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  emergencySubText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoriesContainer: {
    paddingRight: 20,
  },
  categoryButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 80,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewToggleSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  incidentsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  incidentCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  incidentDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginBottom: 4,
  },
  organizationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  organizationText: {
    fontSize: 12,
    marginLeft: 4,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  upvoteText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  timeText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  mapPlaceholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  mapSubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  mapContainer: {
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
});

export default HomeScreen;