import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import logger from '../utils/logger';

export interface WebSocketMessage {
  type: 'incident_update' | 'notification' | 'status_change' | 'ping' | 'pong' | 'auth';
  data: any;
  timestamp: string;
}

export interface WebSocketClient {
  id: string;
  userId?: number;
  role?: string;
  organizationId?: number;
  stationId?: number;
  ws: WebSocket;
  isAlive: boolean;
  lastPing: number;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private pingInterval!: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
    this.startPingInterval();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      const client: WebSocketClient = {
        id: clientId,
        ws,
        isAlive: true,
        lastPing: Date.now()
      };

      this.clients.set(clientId, client);
      logger.info(`WebSocket client connected: ${clientId}`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'notification',
        data: { message: 'Connected to Rindwa Emergency Platform' },
        timestamp: new Date().toISOString()
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.info(`WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.isAlive = true;
          client.lastPing = Date.now();
        }
      });
    });
  }

  private handleMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          data: {},
          timestamp: new Date().toISOString()
        });
        break;

      case 'auth':
        // Handle authentication
        if (message.data.userId) {
          client.userId = message.data.userId;
          client.role = message.data.role;
          client.organizationId = message.data.organizationId;
          client.stationId = message.data.stationId;
          
          this.sendToClient(clientId, {
            type: 'notification',
            data: { message: 'Authentication successful' },
            timestamp: new Date().toISOString()
          });
          
          logger.info(`Client ${clientId} authenticated as user ${message.data.userId}`);
        }
        break;

      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          logger.info(`Terminating inactive client: ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // Ping every 30 seconds
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendToClient(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(`Error sending message to client ${clientId}:`, error);
      }
    }
  }

  /**
   * Send message to all connected clients
   */
  public broadcast(message: WebSocketMessage) {
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  /**
   * Send message to specific user
   */
  public sendToUser(userId: number, message: WebSocketMessage) {
    this.clients.forEach((client, clientId) => {
      if (client.userId === userId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  /**
   * Send message to users with specific role
   */
  public sendToRole(role: string, message: WebSocketMessage) {
    this.clients.forEach((client, clientId) => {
      if (client.role === role) {
        this.sendToClient(clientId, message);
      }
    });
  }

  /**
   * Send message to users in specific organization
   */
  public sendToOrganization(organizationId: number, message: WebSocketMessage) {
    this.clients.forEach((client, clientId) => {
      if (client.organizationId === organizationId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  /**
   * Send message to users in specific station
   */
  public sendToStation(stationId: number, message: WebSocketMessage) {
    this.clients.forEach((client, clientId) => {
      if (client.stationId === stationId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  /**
   * Send incident update to relevant users
   */
  public sendIncidentUpdate(incident: any, eventType: string, user?: any) {
    const message: WebSocketMessage = {
      type: 'incident_update',
      data: {
        incidentId: incident.id,
        eventType,
        incident: {
          id: incident.id,
          title: incident.title,
          status: incident.status,
          priority: incident.priority,
          locationAddress: incident.locationAddress,
          updatedAt: incident.updatedAt
        },
        user: user ? {
          id: user.userId,
          name: `${user.firstName} ${user.lastName}`.trim()
        } : null
      },
      timestamp: new Date().toISOString()
    };

    // Send to station staff if incident is assigned to a station
    if (incident.stationId) {
      this.sendToStation(incident.stationId, message);
    }

    // Send to organization staff if incident is assigned to an organization
    if (incident.organizationId) {
      this.sendToOrganization(incident.organizationId, message);
    }

    // Send to assigned user if incident is assigned
    if (incident.assignedToId) {
      this.sendToUser(incident.assignedToId, message);
    }

    // Broadcast to all admin users
    this.sendToRole('main_admin', message);
    this.sendToRole('super_admin', message);
    this.sendToRole('station_admin', message);
  }

  /**
   * Send notification to specific user
   */
  public sendNotification(userId: number, notification: any) {
    const message: WebSocketMessage = {
      type: 'notification',
      data: {
        notificationId: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead
      },
      timestamp: new Date().toISOString()
    };

    this.sendToUser(userId, message);
  }

  /**
   * Send status change notification
   */
  public sendStatusChange(entityType: string, entityId: number, status: string, user?: any) {
    const message: WebSocketMessage = {
      type: 'status_change',
      data: {
        entityType,
        entityId,
        status,
        user: user ? {
          id: user.userId,
          name: `${user.firstName} ${user.lastName}`.trim()
        } : null
      },
      timestamp: new Date().toISOString()
    };

    // Broadcast to all admin users
    this.sendToRole('main_admin', message);
    this.sendToRole('super_admin', message);
    this.sendToRole('station_admin', message);
  }

  /**
   * Get connected clients count
   */
  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get connected clients info
   */
  public getConnectedClientsInfo(): Array<{
    id: string;
    userId?: number;
    role?: string;
    organizationId?: number;
    stationId?: number;
    isAlive: boolean;
    lastPing: number;
  }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      userId: client.userId,
      role: client.role,
      organizationId: client.organizationId,
      stationId: client.stationId,
      isAlive: client.isAlive,
      lastPing: client.lastPing
    }));
  }

  /**
   * Cleanup resources
   */
  public cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.clients.forEach((client) => {
      client.ws.close();
    });
    
    this.clients.clear();
    this.wss.close();
  }
} 