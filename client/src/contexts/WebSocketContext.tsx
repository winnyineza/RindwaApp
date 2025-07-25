import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import pushNotificationService from '@/services/pushNotificationService';

interface WebSocketMessage {
  type: 'incident_update' | 'incident_created' | 'incident_assigned' | 'incident_resolved' | 'user_notification';
  data: any;
  timestamp: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  sendMessage: (message: any) => void;
  subscribe: (eventType: string, callback: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [subscribers, setSubscribers] = useState<Map<string, Set<(data: any) => void>>>(new Map());
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Get WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!user?.userId) return;

    try {
      setConnectionStatus('connecting');
      const wsUrl = getWebSocketUrl();
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log('🔗 WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Send authentication message
        newSocket.send(JSON.stringify({
          type: 'auth',
          token: localStorage.getItem('token'),
          userId: user.userId,
          role: user.role
        }));

        toast({
          title: "Connected",
          description: "Real-time updates enabled",
          duration: 2000,
        });
      };

      newSocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      newSocket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 3 seconds
        if (event.code !== 1000) { // Not a normal closure
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };

      newSocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
        toast({
          title: "Connection Error",
          description: "Real-time updates temporarily unavailable",
          variant: "destructive",
          duration: 3000,
        });
      };

      setSocket(newSocket);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [user?.userId, user?.role, getWebSocketUrl, toast]);

  // Handle incoming messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('📨 WebSocket message received:', message);

    // Invalidate relevant queries based on message type
    switch (message.type) {
      case 'incident_update':
      case 'incident_created':
      case 'incident_assigned':
      case 'incident_resolved':
        // Refresh incident-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        break;
      
      case 'user_notification':
        // Refresh notification queries
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        break;
    }

    // Notify subscribers
    const eventSubscribers = subscribers.get(message.type);
    if (eventSubscribers) {
      eventSubscribers.forEach(callback => {
        try {
          callback(message.data);
        } catch (error) {
          console.error('Error in WebSocket subscriber callback:', error);
        }
      });
    }

    // Show toast notifications for important updates
    if (message.type === 'incident_assigned' && message.data.assignedToId === user?.userId) {
      toast({
        title: "New Assignment",
        description: `You've been assigned to: ${message.data.title}`,
        duration: 5000,
      });
      
      // Show push notification for assignment
      pushNotificationService.showAssignmentNotification(message.data);
    }

    if (message.type === 'incident_created' && user?.role !== 'citizen') {
      toast({
        title: "New Incident",
        description: `${message.data.title} - ${message.data.priority} priority`,
        duration: 4000,
      });
      
      // Show push notification for high/critical incidents
      if (message.data.priority === 'critical' || message.data.priority === 'high') {
        pushNotificationService.showIncidentNotification(message.data, 'created');
      }
    }

    if (message.type === 'incident_update' && message.data.eventType === 'escalated') {
      // Show push notification for escalations
      pushNotificationService.showEscalationNotification(message.data.incident);
    }
  }, [subscribers, user?.userId, user?.role, toast]);

  // Send message through WebSocket
  const sendMessage = useCallback((message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }, [socket, isConnected]);

  // Subscribe to specific event types
  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    setSubscribers(prev => {
      const newSubscribers = new Map(prev);
      if (!newSubscribers.has(eventType)) {
        newSubscribers.set(eventType, new Set());
      }
      newSubscribers.get(eventType)!.add(callback);
      return newSubscribers;
    });

    // Return unsubscribe function
    return () => {
      setSubscribers(prev => {
        const newSubscribers = new Map(prev);
        const eventSubscribers = newSubscribers.get(eventType);
        if (eventSubscribers) {
          eventSubscribers.delete(callback);
          if (eventSubscribers.size === 0) {
            newSubscribers.delete(eventType);
          }
        }
        return newSubscribers;
      });
    };
  }, []);

  // Connect when user is authenticated and initialize push notifications
  useEffect(() => {
    if (user?.userId) {
      connect();
      
      // Initialize push notifications for authenticated users
      const initializePushNotifications = async () => {
        const initialized = await pushNotificationService.initialize();
        if (initialized) {
          const permission = await pushNotificationService.requestPermission();
          if (permission === 'granted') {
            await pushNotificationService.subscribe();
            console.log('🔔 Push notifications enabled for user');
          }
        }
      };
      
      initializePushNotifications();
    }

    return () => {
      if (socket) {
        socket.close(1000, 'Component unmounting');
      }
    };
  }, [user?.userId, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close(1000, 'Component unmounting');
      }
    };
  }, [socket]);

  const contextValue: WebSocketContextType = {
    isConnected,
    connectionStatus,
    sendMessage,
    subscribe,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}; 