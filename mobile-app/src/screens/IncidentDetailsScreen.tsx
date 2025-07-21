import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Image,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';

interface Incident {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved';
  location: string;
  upvotes: number;
  created_at: string;
  photo?: string;
}

const IncidentDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useI18n();
  const { colors } = useTheme();
  const incident = route.params?.incident as Incident;
  const [upvotes, setUpvotes] = useState(incident?.upvotes || 0);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  const API_BASE_URL = 'http://localhost:5000/api';

  if (!incident) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          Incident not found
        </Text>
      </View>
    );
  }

  const handleUpvote = async () => {
    if (hasUpvoted) {
      Alert.alert('Already Voted', 'You have already upvoted this incident');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/incidents/${incident.id}/upvote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setUpvotes(prev => prev + 1);
        setHasUpvoted(true);
      }
    } catch (error) {
      console.error('Error upvoting incident:', error);
      Alert.alert('Error', 'Failed to upvote incident');
    }
  };

  const handleDownvote = () => {
    Alert.alert(
      'Report Issue',
      'Is there something wrong with this incident report?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark as Spam', onPress: () => reportIncident('spam') },
        { text: 'Inappropriate', onPress: () => reportIncident('inappropriate') },
        { text: 'False Information', onPress: () => reportIncident('false') },
      ]
    );
  };

  const reportIncident = (reason: string) => {
    Alert.alert('Report Submitted', `This incident has been reported for: ${reason}`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Emergency Incident: ${incident.title}\n\nLocation: ${incident.location}\nPriority: ${incident.priority}\n\nDescription: ${incident.description}`,
        title: 'Emergency Incident Report',
      });
    } catch (error) {
      console.error('Error sharing incident:', error);
    }
  };

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Details</Text>
        <TouchableOpacity onPress={handleShare}>
          <Icon name="share" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Incident Photo */}
        {incident.photo && (
          <Image source={{ uri: incident.photo }} style={styles.incidentImage} />
        )}

        {/* Title and Status */}
        <View style={styles.titleSection}>
          <Text style={[styles.incidentTitle, { color: colors.text }]}>
            {incident.title}
          </Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(incident.priority) }]}>
              <Text style={styles.badgeText}>{incident.priority.toUpperCase()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status) }]}>
              <Text style={styles.badgeText}>{incident.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {incident.description}
          </Text>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
          <View style={styles.locationContainer}>
            <Icon name="location-on" size={20} color={colors.primary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {incident.location}
            </Text>
          </View>
        </View>

        {/* Timestamp */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Reported</Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatDate(incident.created_at)}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: hasUpvoted ? colors.primary : colors.surface },
            ]}
            onPress={handleUpvote}
          >
            <Icon 
              name="thumb-up" 
              size={20} 
              color={hasUpvoted ? '#ffffff' : colors.primary} 
            />
            <Text 
              style={[
                styles.actionText, 
                { color: hasUpvoted ? '#ffffff' : colors.primary }
              ]}
            >
              {upvotes} Support
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={handleDownvote}
          >
            <Icon name="flag" size={20} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>
              Report
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Updates */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Status Updates</Text>
          <View style={[styles.statusUpdate, { backgroundColor: colors.surface }]}>
            <View style={styles.statusHeader}>
              <Icon name="info" size={16} color={colors.primary} />
              <Text style={[styles.statusTime, { color: colors.textSecondary }]}>
                {formatDate(incident.created_at)}
              </Text>
            </View>
            <Text style={[styles.statusMessage, { color: colors.text }]}>
              Incident reported and under review
            </Text>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={[styles.emergencySection, { backgroundColor: colors.error }]}>
          <Icon name="emergency" size={24} color="#ffffff" />
          <View style={styles.emergencyText}>
            <Text style={styles.emergencyTitle}>Emergency?</Text>
            <Text style={styles.emergencySubtitle}>
              If this is an active emergency, call emergency services immediately
            </Text>
          </View>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={() => Alert.alert('Emergency Call', 'Calling emergency services...')}
          >
            <Text style={styles.emergencyButtonText}>CALL</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  incidentImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  titleSection: {
    padding: 20,
    paddingBottom: 0,
  },
  incidentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  section: {
    padding: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    marginLeft: 8,
  },
  timeText: {
    fontSize: 16,
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusUpdate: {
    padding: 16,
    borderRadius: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  statusMessage: {
    fontSize: 14,
  },
  emergencySection: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  emergencyText: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  emergencySubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  emergencyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emergencyButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default IncidentDetailsScreen;