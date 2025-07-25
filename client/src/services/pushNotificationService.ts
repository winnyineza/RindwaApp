interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
}

interface SubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private isSupported: boolean = false;

  constructor() {
    this.checkSupport();
  }

  private checkSupport(): void {
    this.isSupported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
  }

  public isNotificationSupported(): boolean {
    return this.isSupported;
  }

  public async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Push notifications not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('🔔 Service Worker registered for push notifications');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return 'default';
    }

    const permission = await Notification.requestPermission();
    console.log('🔔 Notification permission:', permission);
    return permission;
  }

  public getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  public async subscribe(): Promise<SubscriptionInfo | null> {
    if (!this.registration || this.getPermissionStatus() !== 'granted') {
      return null;
    }

    try {
      // Create push subscription
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.VITE_VAPID_PUBLIC_KEY || 'your-vapid-public-key'
        )
      });

      const subscriptionInfo: SubscriptionInfo = {
        endpoint: this.subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(this.subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(this.subscription.getKey('auth')!)
        }
      };

      // Send subscription to server
      await this.sendSubscriptionToServer(subscriptionInfo);

      console.log('🔔 Push notification subscription created');
      return subscriptionInfo;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  public async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true;
    }

    try {
      const success = await this.subscription.unsubscribe();
      if (success) {
        this.subscription = null;
        console.log('🔔 Push notification subscription removed');
      }
      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  public async showNotification(payload: NotificationPayload): Promise<void> {
    if (!this.registration || this.getPermissionStatus() !== 'granted') {
      console.warn('Cannot show notification: not permitted or no registration');
      return;
    }

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      tag: payload.tag || 'rindwa-emergency',
      data: payload.data,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false
    };

    try {
      await this.registration.showNotification(payload.title, options);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  public async showIncidentNotification(incident: any, eventType: string): Promise<void> {
    const priorityColors = {
      critical: '🔴',
      high: '🟠', 
      medium: '🟡',
      low: '🟢'
    };

    const eventTitles = {
      created: 'New Incident Reported',
      assigned: 'Incident Assigned to You',
      updated: 'Incident Updated',
      resolved: 'Incident Resolved',
      escalated: 'Incident Escalated'
    };

    const payload: NotificationPayload = {
      title: `${priorityColors[incident.priority as keyof typeof priorityColors]} ${eventTitles[eventType as keyof typeof eventTitles]}`,
      body: `${incident.title} - ${incident.locationAddress || 'Location not specified'}`,
      icon: '/icon-emergency.png',
      tag: `incident-${incident.id}`,
      requireInteraction: incident.priority === 'critical',
      data: {
        incidentId: incident.id,
        eventType,
        url: `/incidents?highlight=${incident.id}`
      }
    };

    await this.showNotification(payload);
  }

  public async showAssignmentNotification(incident: any): Promise<void> {
    const payload: NotificationPayload = {
      title: '👤 New Case Assigned',
      body: `You've been assigned to: ${incident.title}`,
      icon: '/icon-assignment.png',
      tag: `assignment-${incident.id}`,
      requireInteraction: true,
      data: {
        incidentId: incident.id,
        eventType: 'assignment',
        url: `/incidents?highlight=${incident.id}`
      }
    };

    await this.showNotification(payload);
  }

  public async showEscalationNotification(incident: any): Promise<void> {
    const payload: NotificationPayload = {
      title: '⚠️ Incident Escalated',
      body: `${incident.title} has been escalated and requires immediate attention`,
      icon: '/icon-escalation.png',
      tag: `escalation-${incident.id}`,
      requireInteraction: true,
      data: {
        incidentId: incident.id,
        eventType: 'escalation',
        url: `/incidents?highlight=${incident.id}`
      }
    };

    await this.showNotification(payload);
  }

  private async sendSubscriptionToServer(subscription: SubscriptionInfo): Promise<void> {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService; 