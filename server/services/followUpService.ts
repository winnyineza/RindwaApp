import type { DatabaseStorage } from '../storage';
import { sendEmailMessage } from '../communication';

export interface FollowUpUpdate {
  incidentId: number;
  status: string;
  message: string;
  timestamp: string;
  updatedBy: string;
}

export interface CitizenFollowUp {
  id: number;
  incidentId: number;
  citizenEmail?: string;
  citizenPhone?: string;
  notificationPreference: 'email' | 'sms' | 'both';
  isActive: boolean;
  createdAt: string;
  updates: FollowUpUpdate[];
}

export class FollowUpService {
  constructor(private storage: DatabaseStorage) {}

  // Register citizen for incident follow-up
  async registerForFollowUp(
    incidentId: number, 
    citizenEmail?: string, 
    citizenPhone?: string,
    notificationPreference: 'email' | 'sms' | 'both' = 'email'
  ): Promise<CitizenFollowUp> {
    try {
      // Check if incident exists
      const incident = await this.storage.getIncident(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      // Create follow-up record
      const followUp: CitizenFollowUp = {
        id: Date.now(), // In production, use proper ID generation
        incidentId,
        citizenEmail,
        citizenPhone,
        notificationPreference,
        isActive: true,
        createdAt: new Date().toISOString(),
        updates: []
      };

      // Store in database (simplified - in production use proper storage)


      // Send confirmation
      if (citizenEmail && (notificationPreference === 'email' || notificationPreference === 'both')) {
        await this.sendFollowUpConfirmation(followUp, incident);
      }

      return followUp;
    } catch (error) {

      throw error;
    }
  }

  // Send incident status update to citizens
  async sendIncidentUpdate(
    incidentId: number,
    status: string,
    message: string,
    updatedBy: string
  ): Promise<void> {
    try {
      const incident = await this.storage.getIncident(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      // Get all citizens following this incident (simplified)
      const followers = await this.getIncidentFollowers(incidentId);

      const update: FollowUpUpdate = {
        incidentId,
        status,
        message,
        timestamp: new Date().toISOString(),
        updatedBy
      };

      // Send updates to all followers
      for (const follower of followers) {
        if (follower.isActive) {
          await this.sendUpdateNotification(follower, incident, update);
        }
      }


    } catch (error) {

      throw error;
    }
  }

  // Get citizens following an incident
  private async getIncidentFollowers(incidentId: number): Promise<CitizenFollowUp[]> {
    // In production, query database for followers
    // For now, return mock data for demonstration
    return [
      {
        id: 1,
        incidentId,
        citizenEmail: 'citizen@example.com',
        citizenPhone: '+250788123456',
        notificationPreference: 'both',
        isActive: true,
        createdAt: new Date().toISOString(),
        updates: []
      }
    ];
  }

  // Send follow-up confirmation email
  private async sendFollowUpConfirmation(followUp: CitizenFollowUp, incident: any): Promise<void> {
    if (!followUp.citizenEmail) return;

    const subject = `Incident Follow-up Confirmation - ${incident.title}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Rindwa Emergency Platform</h1>
          <p style="color: white; margin: 10px 0 0 0;">Incident Follow-up Confirmation</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Follow-up Registration Confirmed</h2>
          
          <p style="color: #4b5563; line-height: 1.6;">
            You have successfully registered to receive updates about the following incident:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">${incident.title}</h3>
            <p style="margin: 0; color: #6b7280;"><strong>Incident ID:</strong> #${incident.id}</p>
            <p style="margin: 5px 0 0 0; color: #6b7280;"><strong>Status:</strong> ${incident.status}</p>
            <p style="margin: 5px 0 0 0; color: #6b7280;"><strong>Priority:</strong> ${incident.priority}</p>
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #374151;">What's Next?</h4>
            <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
              <li>You'll receive updates when the incident status changes</li>
              <li>Emergency responders will provide progress reports</li>
              <li>You'll be notified when the incident is resolved</li>
            </ul>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;">
              <strong>Emergency Notice:</strong> If this is an ongoing emergency requiring immediate attention, 
              please call the appropriate emergency services: Police (100), Fire (101), Medical (102).
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This is an automated message from the Rindwa Emergency Platform. 
            If you didn't request this follow-up, please ignore this email.
          </p>
        </div>
        
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            Rindwa Emergency Platform - Keeping Communities Safe
          </p>
        </div>
      </div>
    `;

    try {
      await sendEmailMessage({
        to: followUp.citizenEmail,
        subject,
        html: htmlContent,
      });
      
      console.log(`Sent follow-up confirmation to ${followUp.citizenEmail}`);
    } catch (error) {
      console.error('Failed to send follow-up confirmation:', error);
    }
  }

  // Send update notification to citizen
  private async sendUpdateNotification(
    follower: CitizenFollowUp, 
    incident: any, 
    update: FollowUpUpdate
  ): Promise<void> {
    if (follower.notificationPreference === 'email' || follower.notificationPreference === 'both') {
      if (follower.citizenEmail) {
        await this.sendUpdateEmail(follower.citizenEmail, incident, update);
      }
    }

    if (follower.notificationPreference === 'sms' || follower.notificationPreference === 'both') {
      if (follower.citizenPhone) {
        await this.sendUpdateSMS(follower.citizenPhone, incident, update);
      }
    }
  }

  // Send update email
  private async sendUpdateEmail(email: string, incident: any, update: FollowUpUpdate): Promise<void> {
    const subject = `Incident Update - ${incident.title}`;
    const statusColor = this.getStatusColor(update.status);
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Rindwa Emergency Platform</h1>
          <p style="color: white; margin: 10px 0 0 0;">Incident Status Update</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">New Update Available</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor};">
            <h3 style="margin: 0 0 10px 0; color: #1f2937;">${incident.title}</h3>
            <p style="margin: 0; color: #6b7280;"><strong>Incident ID:</strong> #${incident.id}</p>
            <p style="margin: 5px 0 0 0; color: #6b7280;"><strong>New Status:</strong> 
              <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                ${update.status.toUpperCase()}
              </span>
            </p>
            <p style="margin: 10px 0 0 0; color: #6b7280;"><strong>Updated by:</strong> ${update.updatedBy}</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #374151;">Update Message:</h4>
            <p style="margin: 0; color: #4b5563; line-height: 1.6;">${update.message}</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Update received on ${new Date(update.timestamp).toLocaleString()}
          </p>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e;">
              <strong>Emergency Notice:</strong> If you need immediate assistance, 
              please call emergency services: Police (100), Fire (101), Medical (102).
            </p>
          </div>
        </div>
        
        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            Rindwa Emergency Platform - Keeping Communities Informed
          </p>
        </div>
      </div>
    `;

    try {
      await sendEmailMessage({
        to: email,
        subject,
        html: htmlContent,
      });
      
      console.log(`Sent update email to ${email}`);
    } catch (error) {
      console.error('Failed to send update email:', error);
    }
  }

  // Send update SMS
  private async sendUpdateSMS(phone: string, incident: any, update: FollowUpUpdate): Promise<void> {
    const message = `RINDWA UPDATE: ${incident.title} (ID: #${incident.id}) - Status: ${update.status.toUpperCase()}. ${update.message} Updated by: ${update.updatedBy} at ${new Date(update.timestamp).toLocaleString()}. Emergency: Police 100, Fire 101, Medical 102.`;

    try {
      // In production, use actual SMS service
      console.log(`SMS to ${phone}: ${message}`);
    } catch (error) {
      console.error('Failed to send update SMS:', error);
    }
  }

  // Get color for status
  private getStatusColor(status: string): string {
    const colors = {
      pending: '#f59e0b',
      assigned: '#3b82f6',
      in_progress: '#f97316',
      resolved: '#10b981',
      escalated: '#ef4444',
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  }

  // Unsubscribe citizen from follow-up
  async unsubscribeFromFollowUp(followUpId: number): Promise<void> {
    try {
      // In production, update database record
      console.log(`Unsubscribed citizen from follow-up: ${followUpId}`);
    } catch (error) {
      console.error('Failed to unsubscribe from follow-up:', error);
      throw error;
    }
  }

  // Get follow-up statistics
  async getFollowUpStats(): Promise<{
    totalFollowUps: number;
    activeFollowUps: number;
    updatesPerIncident: number;
    avgResponseTime: number;
  }> {
    // In production, query database for actual stats
    return {
      totalFollowUps: 25,
      activeFollowUps: 18,
      updatesPerIncident: 3.2,
      avgResponseTime: 45 // minutes
    };
  }
}