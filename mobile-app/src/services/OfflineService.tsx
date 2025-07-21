import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export interface OfflineIncident {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  photoUri?: string;
  timestamp: string;
  synced: boolean;
}

export interface OfflineData {
  incidents: OfflineIncident[];
  emergencyContacts: any[];
  lastSync: string | null;
}

interface OfflineContextType {
  isOnline: boolean;
  offlineData: OfflineData;
  addOfflineIncident: (incident: Omit<OfflineIncident, 'id' | 'timestamp' | 'synced'>) => Promise<void>;
  syncOfflineData: () => Promise<void>;
  getStoredIncidents: () => Promise<OfflineIncident[]>;
  clearSyncedData: () => Promise<void>;
  pendingSyncCount: number;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const STORAGE_KEYS = {
  OFFLINE_INCIDENTS: '@rindwa_offline_incidents',
  EMERGENCY_CONTACTS: '@rindwa_emergency_contacts',
  LAST_SYNC: '@rindwa_last_sync',
  CACHED_DATA: '@rindwa_cached_data',
};

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    incidents: [],
    emergencyContacts: [],
    lastSync: null,
  });
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  useEffect(() => {
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online || false);
      
      // Auto-sync when coming back online
      if (online && pendingSyncCount > 0) {
        syncOfflineData();
      }
    });

    // Load offline data on mount
    loadOfflineData();

    return () => unsubscribe();
  }, [pendingSyncCount]);

  const loadOfflineData = async () => {
    try {
      const [incidents, contacts, lastSync] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_INCIDENTS),
        AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
      ]);

      const parsedIncidents = incidents ? JSON.parse(incidents) : [];
      const unsyncedCount = parsedIncidents.filter((i: OfflineIncident) => !i.synced).length;
      
      setOfflineData({
        incidents: parsedIncidents,
        emergencyContacts: contacts ? JSON.parse(contacts) : [],
        lastSync,
      });
      
      setPendingSyncCount(unsyncedCount);
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };

  const addOfflineIncident = async (incidentData: Omit<OfflineIncident, 'id' | 'timestamp' | 'synced'>) => {
    try {
      const newIncident: OfflineIncident = {
        ...incidentData,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      const updatedIncidents = [...offlineData.incidents, newIncident];
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_INCIDENTS,
        JSON.stringify(updatedIncidents)
      );

      setOfflineData(prev => ({
        ...prev,
        incidents: updatedIncidents,
      }));

      setPendingSyncCount(prev => prev + 1);

      // Try to sync immediately if online
      if (isOnline) {
        setTimeout(() => syncOfflineData(), 1000);
      }
    } catch (error) {
      console.error('Failed to save offline incident:', error);
      throw error;
    }
  };

  const syncOfflineData = async () => {
    if (!isOnline) {
      console.log('Cannot sync: device is offline');
      return;
    }

    try {
      const unsyncedIncidents = offlineData.incidents.filter(incident => !incident.synced);
      
      if (unsyncedIncidents.length === 0) {
        console.log('No data to sync');
        return;
      }

      console.log(`Syncing ${unsyncedIncidents.length} offline incidents...`);

      const syncPromises = unsyncedIncidents.map(async (incident) => {
        try {
          // Prepare form data for API
          const formData = new FormData();
          formData.append('title', incident.title);
          formData.append('description', incident.description);
          formData.append('priority', incident.priority);
          
          if (incident.locationLat && incident.locationLng) {
            formData.append('location_lat', incident.locationLat.toString());
            formData.append('location_lng', incident.locationLng.toString());
          }
          
          if (incident.locationAddress) {
            formData.append('location_address', incident.locationAddress);
          }

          // Handle photo upload if exists
          if (incident.photoUri) {
            formData.append('photo', {
              uri: incident.photoUri,
              type: 'image/jpeg',
              name: 'incident_photo.jpg',
            } as any);
          }

          // Send to API
          const response = await fetch('http://192.168.1.100:5000/api/incidents/citizen', {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          if (response.ok) {
            console.log(`Successfully synced incident: ${incident.title}`);
            return { ...incident, synced: true };
          } else {
            console.error(`Failed to sync incident ${incident.id}:`, response.status);
            return incident;
          }
        } catch (error) {
          console.error(`Error syncing incident ${incident.id}:`, error);
          return incident;
        }
      });

      const syncedIncidents = await Promise.all(syncPromises);
      const updatedIncidents = [
        ...offlineData.incidents.filter(incident => incident.synced),
        ...syncedIncidents,
      ];

      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_INCIDENTS,
        JSON.stringify(updatedIncidents)
      );

      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC,
        new Date().toISOString()
      );

      setOfflineData(prev => ({
        ...prev,
        incidents: updatedIncidents,
        lastSync: new Date().toISOString(),
      }));

      const remainingUnsyncedCount = updatedIncidents.filter(i => !i.synced).length;
      setPendingSyncCount(remainingUnsyncedCount);

      console.log(`Sync completed. ${syncedIncidents.filter(i => i.synced).length} incidents synced successfully.`);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const getStoredIncidents = async (): Promise<OfflineIncident[]> => {
    try {
      const storedIncidents = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_INCIDENTS);
      return storedIncidents ? JSON.parse(storedIncidents) : [];
    } catch (error) {
      console.error('Failed to get stored incidents:', error);
      return [];
    }
  };

  const clearSyncedData = async () => {
    try {
      const unsyncedIncidents = offlineData.incidents.filter(incident => !incident.synced);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_INCIDENTS,
        JSON.stringify(unsyncedIncidents)
      );

      setOfflineData(prev => ({
        ...prev,
        incidents: unsyncedIncidents,
      }));

      console.log('Cleared synced data, keeping unsynced incidents');
    } catch (error) {
      console.error('Failed to clear synced data:', error);
    }
  };

  const contextValue: OfflineContextType = {
    isOnline,
    offlineData,
    addOfflineIncident,
    syncOfflineData,
    getStoredIncidents,
    clearSyncedData,
    pendingSyncCount,
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

// Utility functions for cache management
export const CacheManager = {
  async cacheIncidentData(data: any[]) {
    try {
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.CACHED_DATA}_incidents`,
        JSON.stringify({
          data,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('Failed to cache incident data:', error);
    }
  },

  async getCachedIncidentData(): Promise<any[] | null> {
    try {
      const cached = await AsyncStorage.getItem(`${STORAGE_KEYS.CACHED_DATA}_incidents`);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const cacheAge = Date.now() - new Date(parsed.timestamp).getTime();
      
      // Cache expires after 1 hour
      if (cacheAge > 60 * 60 * 1000) {
        await AsyncStorage.removeItem(`${STORAGE_KEYS.CACHED_DATA}_incidents`);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  },

  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.CACHED_DATA));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  },
};