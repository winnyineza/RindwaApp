import type { DatabaseStorage } from '../storage';
import { sendEmailMessage } from '../communication';
import { logger } from '../utils/logger';

export interface PushNotification {
  id: string;
  incidentId: number;
  userId?: string;
  title: string;
  body: string;
  data: {
    type: 'incident_update' | 'incident_assigned' | 'incident_resolved' | 'emergency_alert';
    incidentId: number;
    status?: string;
    priority?: string;
    timestamp: string;
  };
  delivered: boolean;
  createdAt: string;
}

export interface CitizenSubscription {
  id: string;
  incidentId: number;
  pushToken?: string;
  email?: string;
  phone?: string;
  notificationPreferences: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  isActive: boolean;
  createdAt: string;
}

export class PushNotificationService {
  private activeSubscriptions: Map<number, CitizenSubscription[]> = new Map();
  private notificationQueue: PushNotification[] = [];

  constructor(private storage: DatabaseStorage) {
    this.initializeService();
  }

  private async initializeService() {
    
    // In production, connect to Firebase Cloud Messaging or similar service
  }

  // Subscribe citizen to incident notifications
  async subscribeToIncident(
    incidentId: number,
    subscriptionData: {
      pushToken?: string;
      email?: string;
      phone?: string;
      notificationPreferences?: {
        push?: boolean;
        email?: boolean;
        sms?: boolean;
      };
    }
  ): Promise<CitizenSubscription> {
    try {
      const subscription: CitizenSubscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        incidentId,
        pushToken: subscriptionData.pushToken,
        email: subscriptionData.email,
        phone: subscriptionData.phone,
        notificationPreferences: {
          push: subscriptionData.notificationPreferences?.push ?? true,
          email: subscriptionData.notificationPreferences?.email ?? true,
          sms: subscriptionData.notificationPreferences?.sms ?? false,
        },
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // Store subscription
      if (!this.activeSubscriptions.has(incidentId)) {
        this.activeSubscriptions.set(incidentId, []);
      }
      this.activeSubscriptions.get(incidentId)!.push(subscription);

      

      // Send confirmation notification
      if (subscription.notificationPreferences.push && subscription.pushToken) {
        await this.sendPushNotification(subscription.pushToken, {
          title: 'Notification Subscription Confirmed',
          body: `You will receive updates about incident #${incidentId}`,
          data: {
            type: 'incident_update',
            incidentId,
            timestamp: new Date().toISOString(),
          },
        });
      }

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to incident notifications:', error);
      throw error;
    }
  }

  // Send real-time push notification during incident resolution
  async sendIncidentProgressUpdate(
    incidentId: number,
    updateData: {
      status: string;
      priority?: string;
      message: string;
      updatedBy: string;
      location?: string;
    }
  ): Promise<void> {
    try {
      const incident = await this.storage.getIncident(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      const subscribers = this.activeSubscriptions.get(incidentId) || [];
      
      if (subscribers.length === 0) {
        console.log(`No subscribers found for incident #${incidentId}`);
        return;
      }

      const notification: Omit<PushNotification, 'id' | 'createdAt' | 'delivered'> = {
        incidentId,
        title: `Incident Update: ${incident.title}`,
        body: `Status: ${updateData.status.toUpperCase()} - ${updateData.message}`,
        data: {
          type: 'incident_update',
          incidentId,
          status: updateData.status,
          priority: updateData.priority || incident.priority,
          timestamp: new Date().toISOString(),
        },
      };

      // Send push notifications to all subscribers
      const pushPromises = subscribers
        .filter(sub => sub.isActive && sub.notificationPreferences.push && sub.pushToken)
        .map(async (subscriber) => {
          try {
            await this.sendPushNotification(subscriber.pushToken!, {
              title: notification.title,
              body: notification.body,
              data: notification.data,
            });
            logger.info(`Push notification sent to subscriber ${subscriber.id}`);
          } catch (error) {
            console.error(`Failed to send push notification to ${subscriber.id}:`, error);
          }
        });

      await Promise.all(pushPromises);

      logger.info(`Sent progress update to ${subscribers.length} subscribers for incident #${incidentId}`);
    } catch (error) {
      console.error('Failed to send incident progress update:', error);
      throw error;
    }
  }

  // Send detailed email notification when incident is fully resolved
  async sendIncidentResolutionEmail(
    incidentId: number,
    resolutionData: {
      resolvedBy: string;
      resolutionSummary: string;
      actionsToken: string[];
      timeToResolution: number; // minutes
      finalStatus: string;
    }
  ): Promise<void> {
    try {
      const incident = await this.storage.getIncident(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      const subscribers = this.activeSubscriptions.get(incidentId) || [];
      const emailSubscribers = subscribers.filter(
        sub => sub.isActive && sub.notificationPreferences.email && sub.email
      );

      if (emailSubscribers.length === 0) {
        console.log(`No email subscribers found for incident #${incidentId}`);
        return;
      }

      const subject = `Incident Resolved: ${incident.title} - Case #${incidentId}`;
      
      for (const subscriber of emailSubscribers) {
        const htmlContent = this.generateResolutionEmailTemplate(
          incident,
          resolutionData,
          subscriber
        );

        try {
          await sendEmailMessage({
            to: subscriber.email!,
            subject,
            html: htmlContent,
          });
          
          logger.info(`Resolution email sent to ${subscriber.email}`);
        } catch (error) {
          console.error(`Failed to send resolution email to ${subscriber.email}:`, error);
        }
      }

      // Send final push notification about resolution
      await this.sendIncidentProgressUpdate(incidentId, {
        status: 'resolved',
        message: `Incident has been resolved. Check your email for detailed report.`,
        updatedBy: resolutionData.resolvedBy,
      });

      
    } catch (error) {
      console.error('Failed to send incident resolution email:', error);
      throw error;
    }
  }

  // Generate detailed email template for incident resolution
  private generateResolutionEmailTemplate(
    incident: any,
    resolutionData: any,
    subscriber: CitizenSubscription
  ): string {
    const timeToResolutionHours = Math.floor(resolutionData.timeToResolution / 60);
    const timeToResolutionMinutes = resolutionData.timeToResolution % 60;
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Rindwa Emergency Platform</h1>
          <p style="color: white; margin: 15px 0 0 0; font-size: 16px;">Incident Resolution Report</p>
        </div>
        
        <!-- Status Banner -->
        <div style="background: #10b981; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0; font-size: 24px;">INCIDENT RESOLVED</h2>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Case #${incident.id} has been successfully resolved</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px; background: #f9fafb;">
          <!-- Incident Summary -->
          <div style="background: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 5px solid #dc2626;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 20px;">Incident Summary</h3>
            <div style="display: grid; gap: 12px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Title:</strong>
                <span style="color: #1f2937;">${incident.title}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Case ID:</strong>
                <span style="color: #1f2937;">#${incident.id}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Priority:</strong>
                <span style="background: ${this.getPriorityColor(incident.priority)}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                  ${incident.priority.toUpperCase()}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Location:</strong>
                <span style="color: #1f2937;">${incident.locationAddress || 'Location not specified'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <strong style="color: #374151;">Reported:</strong>
                <span style="color: #1f2937;">${new Date(incident.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <!-- Resolution Details -->
          <div style="background: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 5px solid #10b981;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 20px;">Resolution Details</h3>
            <div style="display: grid; gap: 12px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Resolved By:</strong>
                <span style="color: #1f2937;">${resolutionData.resolvedBy}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong style="color: #374151;">Resolution Time:</strong>
                <span style="color: #1f2937;">${timeToResolutionHours}h ${timeToResolutionMinutes}m</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                <strong style="color: #374151;">Final Status:</strong>
                <span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                  ${resolutionData.finalStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Resolution Summary -->
          <div style="background: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 20px;">Resolution Summary</h3>
            <p style="color: #4b5563; line-height: 1.6; margin: 0;">${resolutionData.resolutionSummary}</p>
          </div>
          
          <!-- Actions Taken -->
          ${resolutionData.actionsToken && resolutionData.actionsToken.length > 0 ? `
          <div style="background: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 20px;">Actions Taken</h3>
            <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px; margin: 0;">
              ${resolutionData.actionsToken.map((action: string) => `<li>${action}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          
          <!-- Feedback Section -->
          <div style="background: #fef3c7; padding: 20px; border-radius: 12px; border-left: 5px solid #f59e0b; margin-bottom: 25px;">
            <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">Help Us Improve</h4>
            <p style="margin: 0; color: #92400e; line-height: 1.6;">
              Your feedback helps us improve our emergency response services. 
              If you have any comments about how this incident was handled, please contact us.
            </p>
          </div>
          
          <!-- Emergency Contact Info -->
          <div style="background: #fef2f2; padding: 20px; border-radius: 12px; border-left: 5px solid #ef4444;">
            <h4 style="margin: 0 0 10px 0; color: #dc2626; font-size: 16px;">Emergency Services</h4>
            <p style="margin: 0; color: #dc2626; line-height: 1.6;">
              <strong>Remember:</strong> For new emergencies, always call directly:<br>
              Police: <strong>100</strong> | Fire: <strong>101</strong> | Medical: <strong>102</strong>
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1f2937; padding: 30px 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px; line-height: 1.5;">
            This incident has been officially closed. Thank you for using the Rindwa Emergency Platform.<br>
            Stay safe and help us keep your community secure.
          </p>
          <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 12px;">
            Rindwa Emergency Platform - Keeping Communities Safe and Connected
          </p>
        </div>
      </div>
    `;
  }

  // Send push notification to device
  private async sendPushNotification(
    pushToken: string,
    notification: {
      title: string;
      body: string;
      data: any;
    }
  ): Promise<void> {
    try {
      // In production, use Firebase Cloud Messaging or similar service
      const pushData = {
        to: pushToken,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: '/icons/rindwa-icon.png',
          badge: '/icons/rindwa-badge.png',
          click_action: 'FCM_PLUGIN_ACTIVITY',
        },
        data: notification.data,
        priority: 'high',
        collapse_key: `incident_${notification.data.incidentId}`,
      };

      // Simulate push notification for development
      logger.info(`Push notification sent: ${pushData.title}`);
      
      // In production, make actual API call to FCM:
      // const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(pushData),
      // });
      
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  // Get priority color for styling
  private getPriorityColor(priority: string): string {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#f97316',
      critical: '#ef4444',
    };
    return colors[priority as keyof typeof colors] || '#6b7280';
  }

  // Unsubscribe from incident notifications
  async unsubscribeFromIncident(subscriptionId: string, incidentId: number): Promise<void> {
    try {
      const subscribers = this.activeSubscriptions.get(incidentId) || [];
      const updatedSubscribers = subscribers.map(sub => 
        sub.id === subscriptionId ? { ...sub, isActive: false } : sub
      );
      
      this.activeSubscriptions.set(incidentId, updatedSubscribers);
      logger.info(`Unsubscribed ${subscriptionId} from incident #${incidentId}`);
    } catch (error) {
      console.error('Failed to unsubscribe from incident:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    notificationsSent: number;
    averageResolutionTime: number;
  }> {
    let totalSubscriptions = 0;
    let activeSubscriptions = 0;

    for (const [incidentId, subscribers] of this.activeSubscriptions) {
      totalSubscriptions += subscribers.length;
      activeSubscriptions += subscribers.filter(sub => sub.isActive).length;
    }

    return {
      totalSubscriptions,
      activeSubscriptions,
      notificationsSent: this.notificationQueue.filter(n => n.delivered).length,
      averageResolutionTime: 45, // minutes - calculate from actual data
    };
  }
}