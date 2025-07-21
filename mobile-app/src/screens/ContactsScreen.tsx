import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { apiService, handleApiError, EmergencyAlert } from '../services/api';

interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  icon: string;
  color: string;
}

interface PersonalContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

const ContactsScreen = () => {
  const { t } = useI18n();
  const { colors } = useTheme();

  const emergencyContacts: EmergencyContact[] = [
    {
      id: '1',
      name: t('emergency.police'),
      number: '100',
      icon: 'local-police',
      color: '#3b82f6',
    },
    {
      id: '2',
      name: t('emergency.fire'),
      number: '101',
      icon: 'local-fire-department',
      color: '#ef4444',
    },
    {
      id: '3',
      name: t('emergency.medical'),
      number: '102',
      icon: 'local-hospital',
      color: '#10b981',
    },
  ];

  const [personalContacts, setPersonalContacts] = useState<PersonalContact[]>([
    {
      id: '1',
      name: 'John Doe',
      phone: '+250788123456',
      relationship: 'Family',
    },
    {
      id: '2',
      name: 'Jane Smith',
      phone: '+250788654321',
      relationship: 'Friend',
    },
  ]);

  const handleEmergencyCall = (contact: EmergencyContact) => {
    Alert.alert(
      t('emergency.call'),
      `Call ${contact.name} (${contact.number})?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            Linking.openURL(`tel:${contact.number}`);
            // Also send alert to backend
            sendEmergencyAlert(contact);
          },
        },
      ]
    );
  };

  const handlePersonalCall = (contact: PersonalContact) => {
    Alert.alert(
      'Call Contact',
      `Call ${contact.name}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${contact.phone}`),
        },
      ]
    );
  };

  const sendEmergencyAlert = async (contact: EmergencyContact) => {
    try {
      // Get emergency type based on contact
      let emergencyType: 'police' | 'fire' | 'medical' = 'police';
      if (contact.number === '101') emergencyType = 'fire';
      if (contact.number === '102') emergencyType = 'medical';
      
      const alertData: EmergencyAlert = {
        emergencyType,
        location: 'Mobile App Location',
        message: `Emergency call to ${contact.name} (${contact.number})`,
        contactPhone: contact.number,
      };

      await apiService.sendEmergencyAlert(alertData);
      console.log('Emergency alert sent successfully');
    } catch (error) {
      handleApiError(error);
    }
  };

  const renderEmergencyContact = ({ item }: { item: EmergencyContact }) => (
    <TouchableOpacity
      style={[styles.emergencyCard, { backgroundColor: colors.surface }]}
      onPress={() => handleEmergencyCall(item)}
    >
      <View style={[styles.emergencyIcon, { backgroundColor: item.color }]}>
        <Icon name={item.icon} size={32} color="#ffffff" />
      </View>
      <View style={styles.emergencyInfo}>
        <Text style={[styles.emergencyName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.emergencyNumber, { color: colors.textSecondary }]}>
          {item.number}
        </Text>
      </View>
      <Icon name="call" size={24} color={item.color} />
    </TouchableOpacity>
  );

  const renderPersonalContact = ({ item }: { item: PersonalContact }) => (
    <TouchableOpacity
      style={[styles.personalCard, { backgroundColor: colors.surface }]}
      onPress={() => handlePersonalCall(item)}
    >
      <View style={[styles.personalIcon, { backgroundColor: colors.primary }]}>
        <Icon name="person" size={24} color="#ffffff" />
      </View>
      <View style={styles.personalInfo}>
        <Text style={[styles.personalName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.personalPhone, { color: colors.textSecondary }]}>
          {item.phone}
        </Text>
        <Text style={[styles.personalRelationship, { color: colors.textSecondary }]}>
          {item.relationship}
        </Text>
      </View>
      <Icon name="call" size={20} color={colors.primary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
      </View>

      <FlatList
        data={emergencyContacts}
        renderItem={renderEmergencyContact}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Emergency Services
            </Text>
          </View>
        }
        ListFooterComponent={
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Personal Contacts
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => Alert.alert('Add Contact', 'Feature coming soon')}
              >
                <Icon name="add" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={personalContacts}
              renderItem={renderPersonalContact}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        }
      />
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
  listContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 24,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emergencyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emergencyNumber: {
    fontSize: 14,
  },
  personalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  personalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  personalInfo: {
    flex: 1,
  },
  personalName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  personalPhone: {
    fontSize: 14,
    marginBottom: 2,
  },
  personalRelationship: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default ContactsScreen;