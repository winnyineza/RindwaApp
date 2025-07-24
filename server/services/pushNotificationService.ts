import { storage } from '../storage';
import { sendEmailMessage, sendSMSMessage } from '../communication';

// Firebase Cloud Messaging configuration
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;
const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';

// APNs configuration for iOS
const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'com.rindwa.emergency';

interface CitizenSubscription {
  id: string;
  incidentId: number;
  pushToken?: string;
  deviceType?: 'ios' | 'android' | 'web';
  email?: string;
  phone?: string;
  notificationPreferences: {
    push: boolean;
    email: boolean;
    sms: boolean;
    criticalOnly?: boolean;
    quietHours?: {
      enabled: boolean;
      startTime: string; // "22:00"
      endTime: string;   // "07:00"
    };
  };
  isActive: boolean;
  createdAt: string;
  timezone?: string;
}

interface PushNotificationData {
  title: string;
  body: string;
  data?: any;
  imageUrl?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  priority?: 'normal' | 'high';
  sound?: string;
  badge?: number;
}

interface NotificationDeliveryStatus {
  pushToken: string;
  success: boolean;
  error?: string;
  messageId?: string;
  deliveredAt: string;
}

export class PushNotificationService {
  private activeSubscriptions = new Map<number, CitizenSubscription[]>();
  private deliveryStats = new Map<string, NotificationDeliveryStatus>();
  private storage: any;

  constructor() {
    this.storage = storage;
    console.log('🚀 Advanced Push Notification Service initialized');
    
    if (!FCM_SERVER_KEY) {
      console.warn('⚠️ FCM_SERVER_KEY not configured. Push notifications will be simulated.');
    }
  }

  // Subscribe citizen to incident notifications with enhanced preferences
  async subscribeToIncident(
    incidentId: number,
    subscriptionData: {
      pushToken?: string;
      deviceType?: 'ios' | 'android' | 'web';
      email?: string;
      phone?: string;
      timezone?: string;
      notificationPreferences?: {
        push?: boolean;
        email?: boolean;
        sms?: boolean;
        criticalOnly?: boolean;
        quietHours?: {
          enabled: boolean;
          startTime: string;
          endTime: string;
        };
      };
    }
  ): Promise<CitizenSubscription> {
    try {
      const subscription: CitizenSubscription = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        incidentId,
        pushToken: subscriptionData.pushToken,
        deviceType: subscriptionData.deviceType,
        email: subscriptionData.email,
        phone: subscriptionData.phone,
        timezone: subscriptionData.timezone || 'Africa/Kigali',
        notificationPreferences: {
          push: subscriptionData.notificationPreferences?.push ?? true,
          email: subscriptionData.notificationPreferences?.email ?? true,
          sms: subscriptionData.notificationPreferences?.sms ?? false,
          criticalOnly: subscriptionData.notificationPreferences?.criticalOnly ?? false,
          quietHours: subscriptionData.notificationPreferences?.quietHours || {
            enabled: false,
            startTime: "22:00",
            endTime: "07:00"
          }
        },
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // Store subscription
      if (!this.activeSubscriptions.has(incidentId)) {
        this.activeSubscriptions.set(incidentId, []);
      }
      this.activeSubscriptions.get(incidentId)!.push(subscription);

      console.log(`📱 New subscription created for incident #${incidentId}:`, {
        id: subscription.id,
        deviceType: subscription.deviceType,
        preferences: subscription.notificationPreferences
      });

      // Send confirmation notification
      if (subscription.notificationPreferences.push && subscription.pushToken) {
        await this.sendAdvancedPushNotification(subscription.pushToken, subscription.deviceType, {
          title: '🔔 Subscription Confirmed',
          body: `You'll receive updates about incident #${incidentId}`,
          data: {
            type: 'subscription_confirmed',
            incidentId,
            timestamp: new Date().toISOString(),
          },
          imageUrl: 'https://rindwa.com/images/notification-icon.png',
          actions: [
            {
              action: 'view_incident',
              title: 'View Incident',
              icon: 'eye'
            },
            {
              action: 'manage_preferences',
              title: 'Settings',
              icon: 'settings'
            }
          ]
        });
      }

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to incident notifications:', error);
      throw error;
    }
  }

  // Send incident progress update with enhanced messaging
  async sendIncidentProgressUpdate(
    incidentId: number,
    updateData: {
      status: string;
      priority?: string;
      message: string;
      updatedBy: string;
      location?: string;
      estimatedTime?: string;
      actionRequired?: boolean;
    }
  ): Promise<void> {
    try {
      const incident = await this.storage.getIncident(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      const subscribers = this.activeSubscriptions.get(incidentId) || [];
      const activeSubscribers = subscribers.filter(sub => sub.isActive);

      if (activeSubscribers.length === 0) {
        console.log(`No active subscribers found for incident #${incidentId}`);
        return;
      }

      console.log(`📢 Sending progress update to ${activeSubscribers.length} subscribers for incident #${incidentId}`);

      // Determine notification priority and urgency
      const isUrgent = updateData.priority === 'critical' || updateData.status === 'escalated';
      const statusEmoji = this.getStatusEmoji(updateData.status);

      // Send notifications to all active subscribers
      for (const subscriber of activeSubscribers) {
        // Check if we should skip notification due to preferences
        if (subscriber.notificationPreferences.criticalOnly && !isUrgent) {
          continue;
        }

        // Check quiet hours
        if (this.isQuietHours(subscriber)) {
          console.log(`⏰ Skipping notification for subscriber ${subscriber.id} due to quiet hours`);
          continue;
        }

        // Send push notification
        if (subscriber.notificationPreferences.push && subscriber.pushToken) {
          const pushData: PushNotificationData = {
            title: `${statusEmoji} Incident Update #${incidentId}`,
            body: `Status: ${updateData.status.toUpperCase()} - ${updateData.message}`,
            data: {
              type: 'incident_update',
              incidentId,
              status: updateData.status,
              priority: updateData.priority,
              updatedBy: updateData.updatedBy,
              timestamp: new Date().toISOString(),
              actionRequired: updateData.actionRequired
            },
            priority: isUrgent ? 'high' : 'normal',
            sound: isUrgent ? 'emergency' : 'default',
            actions: [
              {
                action: 'view_details',
                title: 'View Details',
                icon: 'info'
              },
              {
                action: 'share_update',
                title: 'Share',
                icon: 'share'
              }
            ]
          };

          await this.sendAdvancedPushNotification(
            subscriber.pushToken,
            subscriber.deviceType,
            pushData
          );
        }

        // Send email notification
        if (subscriber.notificationPreferences.email && subscriber.email) {
          const emailSubject = `${statusEmoji} Emergency Update: Incident #${incidentId}`;
          const emailBody = this.generateUpdateEmailTemplate(incident, updateData, subscriber);

                     await sendEmailMessage({
             to: subscriber.email,
             subject: emailSubject,
             body: emailBody
           });
        }

        // Send SMS notification
        if (subscriber.notificationPreferences.sms && subscriber.phone) {
          const smsMessage = this.generateUpdateSMSMessage(incidentId, updateData);
          
          await sendSMSMessage({
            to: subscriber.phone,
            message: smsMessage
          });
        }
      }

      console.log(`✅ Progress update sent successfully for incident #${incidentId}`);
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
             body: htmlContent,
           });
           
           console.log(`📧 Resolution email sent to ${subscriber.email}`);
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

  // Send advanced push notification with FCM
  private async sendAdvancedPushNotification(
    pushToken: string,
    deviceType: 'ios' | 'android' | 'web' = 'android',
    notification: PushNotificationData
  ): Promise<NotificationDeliveryStatus> {
    const deliveryStatus: NotificationDeliveryStatus = {
      pushToken,
      success: false,
      deliveredAt: new Date().toISOString()
    };

    try {
      if (!FCM_SERVER_KEY) {
        // Simulation mode for development
        console.log(`📱 [SIMULATED] Push notification to ${deviceType}:`, {
          token: pushToken.substring(0, 20) + '...',
          title: notification.title,
          body: notification.body,
          data: notification.data,
          priority: notification.priority
        });
        
        deliveryStatus.success = true;
        deliveryStatus.messageId = `sim_${Date.now()}`;
        this.deliveryStats.set(pushToken, deliveryStatus);
        return deliveryStatus;
      }

      // Prepare FCM payload based on device type
      const fcmPayload = this.prepareFCMPayload(pushToken, deviceType, notification);

      // Send to Firebase Cloud Messaging
      const response = await fetch(FCM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `key=${FCM_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fcmPayload),
      });

      const result = await response.json();

      if (response.ok && result.success === 1) {
        deliveryStatus.success = true;
        deliveryStatus.messageId = result.results?.[0]?.message_id;
        console.log(`📱 Push notification sent successfully to ${deviceType} device`);
      } else {
        deliveryStatus.success = false;
        deliveryStatus.error = result.results?.[0]?.error || result.error || 'Unknown FCM error';
        console.error(`❌ Failed to send push notification:`, deliveryStatus.error);
      }

    } catch (error: any) {
      deliveryStatus.success = false;
      deliveryStatus.error = error.message;
      console.error('Push notification error:', error);
    }

    this.deliveryStats.set(pushToken, deliveryStatus);
    return deliveryStatus;
  }

  // Prepare FCM payload for different device types
  private prepareFCMPayload(pushToken: string, deviceType: 'ios' | 'android' | 'web', notification: PushNotificationData): any {
    const basePayload = {
      to: pushToken,
      priority: notification.priority === 'high' ? 'high' : 'normal',
      data: {
        ...notification.data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    };

    switch (deviceType) {
      case 'ios':
        return {
          ...basePayload,
          notification: {
            title: notification.title,
            body: notification.body,
            sound: notification.sound || 'default',
            badge: notification.badge || 1,
            mutable_content: true,
            category: 'INCIDENT_UPDATE'
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: notification.title,
                  body: notification.body
                },
                sound: notification.sound || 'default',
                badge: notification.badge || 1,
                'mutable-content': 1,
                category: 'INCIDENT_UPDATE'
              }
            },
            fcm_options: {
              image: notification.imageUrl
            }
          }
        };

      case 'android':
        return {
          ...basePayload,
          notification: {
            title: notification.title,
            body: notification.body,
            icon: 'ic_notification',
            color: '#dc2626',
            sound: notification.sound || 'default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            channel_id: 'emergency_updates'
          },
          android: {
            notification: {
              title: notification.title,
              body: notification.body,
              icon: 'ic_notification',
              color: '#dc2626',
              sound: notification.sound || 'default',
              channel_id: 'emergency_updates',
              priority: notification.priority === 'high' ? 'high' : 'default',
              visibility: 'public',
              image: notification.imageUrl
            }
          }
        };

      case 'web':
      default:
        return {
          ...basePayload,
          notification: {
            title: notification.title,
            body: notification.body,
            icon: '/icons/notification-icon.png',
            image: notification.imageUrl,
            badge: '/icons/badge-icon.png',
            requireInteraction: notification.priority === 'high',
            actions: notification.actions?.map(action => ({
              action: action.action,
              title: action.title,
              icon: `/icons/${action.icon}.png`
            }))
          },
          webpush: {
            fcm_options: {
              link: '/incidents'
            }
          }
        };
    }
  }

  // Check if current time is within quiet hours for subscriber
  private isQuietHours(subscriber: CitizenSubscription): boolean {
    if (!subscriber.notificationPreferences.quietHours?.enabled) {
      return false;
    }

    const now = new Date();
    const timezone = subscriber.timezone || 'Africa/Kigali';
    
    // Convert current time to subscriber's timezone
    const subscriberTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const currentHour = subscriberTime.getHours();
    const currentMinute = subscriberTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const quietHours = subscriber.notificationPreferences.quietHours!;
    const [startHour, startMinute] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = quietHours.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      // Same day range (e.g., 14:00 - 18:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight range (e.g., 22:00 - 07:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Get emoji for status
  private getStatusEmoji(status: string): string {
    const statusEmojis: { [key: string]: string } = {
      'pending': '⏳',
      'assigned': '👤',
      'in_progress': '🚨',
      'resolved': '✅',
      'escalated': '🔴',
      'cancelled': '❌'
    };
    return statusEmojis[status] || '📢';
  }

  // Generate enhanced SMS message template
  private generateUpdateSMSMessage(incidentId: number, updateData: any): string {
    const statusEmoji = this.getStatusEmoji(updateData.status);
    let message = `${statusEmoji} RINDWA ALERT #${incidentId}\n`;
    message += `Status: ${updateData.status.toUpperCase()}\n`;
    message += `${updateData.message}\n`;
    
    if (updateData.estimatedTime) {
      message += `ETA: ${updateData.estimatedTime}\n`;
    }
    
    if (updateData.location) {
      message += `Location: ${updateData.location}\n`;
    }
    
    message += `Updated by: ${updateData.updatedBy}\n`;
    message += `Time: ${new Date().toLocaleString('en-RW', { timeZone: 'Africa/Kigali' })}\n`;
    message += `Emergency: Police 100 | Fire 101 | Medical 102`;
    
    return message;
  }

  // Generate enhanced email template
  private generateUpdateEmailTemplate(incident: any, updateData: any, subscriber: CitizenSubscription): string {
    const statusEmoji = this.getStatusEmoji(updateData.status);
    const priorityColor = this.getPriorityColor(updateData.priority);
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Incident Update - Rindwa Emergency</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">${statusEmoji} Incident Update</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Case #${incident.id}</p>
      </div>
      
      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin-top: 0;">${incident.title}</h2>
          
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; font-weight: bold;">
              ${updateData.status}
            </span>
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Latest Update</h3>
            <p style="margin: 0; font-size: 16px;">${updateData.message}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; width: 30%;">Priority:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${updateData.priority || incident.priority}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Location:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${updateData.location || incident.location}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Updated by:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${updateData.updatedBy}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Time:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${new Date().toLocaleString()}</td>
            </tr>
            ${updateData.estimatedTime ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Estimated Completion:</td>
              <td style="padding: 8px 0;">${updateData.estimatedTime}</td>
            </tr>
            ` : ''}
          </table>
          
          ${updateData.actionRequired ? `
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e; font-weight: bold;">⚠️ Action Required</p>
            <p style="margin: 5px 0 0 0; color: #92400e;">Please check the incident details for required actions.</p>
          </div>
          ` : ''}
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://rindwa.com/incidents/${incident.id}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            View Full Details
          </a>
        </div>
      </div>
      
      <div style="background: #374151; color: #d1d5db; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 14px;">
        <p style="margin: 0 0 10px 0;">Emergency Services Rwanda</p>
        <p style="margin: 0; font-size: 12px;">Police: 100 | Fire: 101 | Medical: 102</p>
        <p style="margin: 10px 0 0 0; font-size: 12px;">
          <a href="https://rindwa.com/unsubscribe/${subscriber.id}" style="color: #9ca3af;">Manage Notifications</a>
        </p>
      </div>
    </body>
    </html>
    `;
  }

  // Get color for priority level
  private getPriorityColor(priority?: string): string {
    const priorityColors: { [key: string]: string } = {
      'low': '#10b981',
      'medium': '#f59e0b',
      'high': '#f97316',
      'critical': '#dc2626'
    };
    return priorityColors[priority || 'medium'] || '#6b7280';
  }

  // Get notification statistics
  async getNotificationStats(): Promise<any> {
    const stats = {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      deliveryStats: {
        successful: 0,
        failed: 0,
        pending: 0
      },
      subscriptionsByType: {
        push: 0,
        email: 0,
        sms: 0
      },
      deviceTypes: {
        ios: 0,
        android: 0,
        web: 0
      }
    };

         // Count subscriptions
     Array.from(this.activeSubscriptions.entries()).forEach(([incidentId, subscribers]) => {
       stats.totalSubscriptions += subscribers.length;
       
       subscribers.forEach((subscriber: CitizenSubscription) => {
         if (subscriber.isActive) {
           stats.activeSubscriptions++;
         }
         
         if (subscriber.notificationPreferences.push) {
           stats.subscriptionsByType.push++;
         }
         if (subscriber.notificationPreferences.email) {
           stats.subscriptionsByType.email++;
         }
         if (subscriber.notificationPreferences.sms) {
           stats.subscriptionsByType.sms++;
         }
         
         if (subscriber.deviceType && (subscriber.deviceType in stats.deviceTypes)) {
           stats.deviceTypes[subscriber.deviceType as keyof typeof stats.deviceTypes]++;
         }
       });
     });

     // Count delivery stats
     Array.from(this.deliveryStats.entries()).forEach(([token, delivery]) => {
       if (delivery.success) {
         stats.deliveryStats.successful++;
       } else {
         stats.deliveryStats.failed++;
       }
     });

    return stats;
  }

  // Update notification preferences for a subscription
  async updateNotificationPreferences(
    subscriptionId: string,
    preferences: Partial<CitizenSubscription['notificationPreferences']>
  ): Promise<boolean> {
         try {
       for (const [incidentId, subscribers] of Array.from(this.activeSubscriptions.entries())) {
         const subscription = subscribers.find((sub: CitizenSubscription) => sub.id === subscriptionId);
         if (subscription) {
           subscription.notificationPreferences = {
             ...subscription.notificationPreferences,
             ...preferences
           };
           
           console.log(`✅ Updated notification preferences for subscription ${subscriptionId}`);
           return true;
         }
       }
       
       console.warn(`❌ Subscription ${subscriptionId} not found`);
       return false;
     } catch (error) {
       console.error('Failed to update notification preferences:', error);
       return false;
     }
  }

  // Unsubscribe from notifications
  async unsubscribe(subscriptionId: string): Promise<boolean> {
    try {
      for (const [incidentId, subscribers] of this.activeSubscriptions) {
        const subscriptionIndex = subscribers.findIndex(sub => sub.id === subscriptionId);
        if (subscriptionIndex !== -1) {
          subscribers[subscriptionIndex].isActive = false;
          console.log(`✅ Unsubscribed subscription ${subscriptionId}`);
          return true;
        }
      }
      
      console.warn(`❌ Subscription ${subscriptionId} not found`);
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  // Clean up expired subscriptions and delivery stats
  async cleanup(): Promise<void> {
    try {
      const now = new Date();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      // Clean up old subscriptions
      for (const [incidentId, subscribers] of this.activeSubscriptions) {
        const activeSubscribers = subscribers.filter(sub => {
          const createdAt = new Date(sub.createdAt);
          return (now.getTime() - createdAt.getTime()) <= maxAge && sub.isActive;
        });
        
        if (activeSubscribers.length === 0) {
          this.activeSubscriptions.delete(incidentId);
        } else {
          this.activeSubscriptions.set(incidentId, activeSubscribers);
        }
      }

      // Clean up old delivery stats
      for (const [token, delivery] of this.deliveryStats) {
        const deliveredAt = new Date(delivery.deliveredAt);
        if ((now.getTime() - deliveredAt.getTime()) > maxAge) {
          this.deliveryStats.delete(token);
        }
      }

      console.log('🧹 Notification cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup notifications:', error);
    }
  }

  // Send bulk notifications for system-wide alerts
  async sendBulkEmergencyAlert(
    title: string,
    message: string,
    priority: 'normal' | 'high' = 'high',
    targetCriteria?: {
      deviceTypes?: ('ios' | 'android' | 'web')[];
      areas?: string[];
      maxDistance?: number; // in km from incident location
    }
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    try {
      const allSubscribers: CitizenSubscription[] = [];
      
      // Collect all active subscribers
      for (const [incidentId, subscribers] of this.activeSubscriptions) {
        allSubscribers.push(...subscribers.filter(sub => sub.isActive));
      }

      // Filter by criteria if provided
      let targetSubscribers = allSubscribers;
      if (targetCriteria?.deviceTypes) {
        targetSubscribers = targetSubscribers.filter(sub => 
          sub.deviceType && targetCriteria.deviceTypes!.includes(sub.deviceType)
        );
      }

      console.log(`📢 Sending bulk emergency alert to ${targetSubscribers.length} subscribers`);

      // Send to all target subscribers
      for (const subscriber of targetSubscribers) {
        try {
          if (subscriber.notificationPreferences.push && subscriber.pushToken) {
            await this.sendAdvancedPushNotification(
              subscriber.pushToken,
              subscriber.deviceType,
              {
                title: `🚨 ${title}`,
                body: message,
                data: {
                  type: 'emergency_alert',
                  timestamp: new Date().toISOString(),
                  priority
                },
                priority,
                sound: 'emergency'
              }
            );
          }
          sent++;
        } catch (error) {
          console.error(`Failed to send bulk alert to subscriber ${subscriber.id}:`, error);
          failed++;
        }
      }

      console.log(`✅ Bulk emergency alert completed: ${sent} sent, ${failed} failed`);
      return { sent, failed };

    } catch (error) {
      console.error('Failed to send bulk emergency alert:', error);
      throw error;
    }
  }
}