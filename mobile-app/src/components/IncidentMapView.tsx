import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/I18nContext';

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

interface IncidentMapViewProps {
  incidents: Incident[];
  onIncidentPress: (incident: Incident) => void;
  currentLocation?: { latitude: number; longitude: number };
}

const IncidentMapView: React.FC<IncidentMapViewProps> = ({
  incidents,
  onIncidentPress,
  currentLocation,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Default to Kigali, Rwanda if no current location
  const defaultRegion = {
    latitude: -1.9441,
    longitude: 30.0619,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const initialRegion = currentLocation
    ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }
    : defaultRegion;

  // Filter incidents that have valid coordinates
  const validIncidents = incidents.filter(
    (incident) => 
      incident.location_lat && 
      incident.location_lng && 
      !isNaN(parseFloat(incident.location_lat)) && 
      !isNaN(parseFloat(incident.location_lng))
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return '#ef4444'; // red
      case 'high':
        return '#f97316'; // orange
      case 'medium':
        return '#f59e0b'; // yellow
      case 'low':
        return '#10b981'; // green
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return '#10b981'; // green
      case 'in_progress':
        return '#3b82f6'; // blue
      case 'assigned':
        return '#8b5cf6'; // purple
      case 'pending':
        return '#6b7280'; // gray
      default:
        return '#6b7280';
    }
  };

  const handleMarkerPress = (incident: Incident) => {
    setSelectedIncident(incident);
  };

  const handleIncidentSelect = (incident: Incident) => {
    setSelectedIncident(null);
    onIncidentPress(incident);
  };

  if (validIncidents.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Icon name="map" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t('noIncidentsOnMap')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {t('incidentsWillAppearHere')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {/* Current location marker */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Your Location"
            pinColor="blue"
          />
        )}

        {/* Incident markers */}
        {validIncidents.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={{
              latitude: parseFloat(incident.location_lat),
              longitude: parseFloat(incident.location_lng),
            }}
            onPress={() => handleMarkerPress(incident)}
            pinColor={getPriorityColor(incident.priority)}
          >
            <Callout
              style={[styles.callout, { backgroundColor: colors.surface }]}
              onPress={() => handleIncidentSelect(incident)}
            >
              <View style={styles.calloutContent}>
                <Text style={[styles.calloutTitle, { color: colors.text }]}>
                  {incident.title}
                </Text>
                
                <View style={styles.calloutBadges}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(incident.priority) }]}>
                    <Text style={styles.badgeText}>{incident.priority.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status) }]}>
                    <Text style={styles.badgeText}>{incident.status.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={[styles.calloutDescription, { color: colors.textSecondary }]}>
                  {incident.description.length > 80 
                    ? `${incident.description.substring(0, 80)}...` 
                    : incident.description}
                </Text>

                <View style={styles.calloutFooter}>
                  <View style={styles.calloutMeta}>
                    <Icon name="location-on" size={12} color={colors.textSecondary} />
                    <Text style={[styles.calloutLocation, { color: colors.textSecondary }]}>
                      {incident.location_address || 'Location available'}
                    </Text>
                  </View>
                  
                  <View style={styles.calloutMeta}>
                    <Icon name="thumb-up" size={12} color={colors.textSecondary} />
                    <Text style={[styles.calloutUpvotes, { color: colors.textSecondary }]}>
                      {incident.upvotes} upvotes
                    </Text>
                  </View>
                </View>

                <Text style={[styles.tapToView, { color: colors.primary }]}>
                  Tap to view details
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Map legend */}
      <View style={[styles.legend, { backgroundColor: colors.surface }]}>
        <Text style={[styles.legendTitle, { color: colors.text }]}>Priority Levels</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Critical</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>High</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Medium</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Low</Text>
          </View>
        </View>
      </View>

      {/* Incident count */}
      <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
        <Text style={styles.countText}>{validIncidents.length} incidents</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  callout: {
    width: 250,
    padding: 12,
    borderRadius: 8,
  },
  calloutContent: {
    flex: 1,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  calloutBadges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  calloutDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  calloutFooter: {
    gap: 4,
    marginBottom: 8,
  },
  calloutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calloutLocation: {
    fontSize: 11,
  },
  calloutUpvotes: {
    fontSize: 11,
  },
  tapToView: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  legend: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  legendItems: {
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
  countBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default IncidentMapView;