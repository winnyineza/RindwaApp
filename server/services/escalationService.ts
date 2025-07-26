import { Incident, User } from '@shared/models';
import { DatabaseStorage } from '../storage';

export interface EscalationRule {
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeThreshold: number; // in minutes
  autoEscalate: boolean;
  keywords?: string[];
}

export class EscalationService {
  private storage: DatabaseStorage;
  private escalationRules: EscalationRule[] = [
    { priority: 'critical', timeThreshold: 5, autoEscalate: true },
    { priority: 'high', timeThreshold: 15, autoEscalate: true },
    { priority: 'medium', timeThreshold: 60, autoEscalate: true },
    { priority: 'low', timeThreshold: 240, autoEscalate: true }, // 4 hours
  ];

  private emergencyKeywords = [
    'fire', 'burn', 'smoke', 'flames', 'explosion', 'burning',
    'medical', 'health', 'ambulance', 'injury', 'accident', 'emergency',
    'heart', 'breathing', 'unconscious', 'bleeding', 'pain',
    'security', 'threat', 'weapon', 'violence', 'attack', 'danger'
  ];

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  /**
   * Get escalation level based on user role
   * Level 0: Station Staff
   * Level 1: Station Admin  
   * Level 2: Super Admin
   * Level 3: Main Admin
   */
  getUserEscalationLevel(role: string): number {
    switch (role) {
      case 'station_staff': return 0;
      case 'station_admin': return 1;
      case 'super_admin': return 2;
      case 'main_admin': return 3;
      default: return 0;
    }
  }

  /**
   * Check if incident contains emergency keywords
   */
  hasEmergencyKeywords(title: string, description: string): boolean {
    const text = `${title} ${description}`.toLowerCase();
    return this.emergencyKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if incident should be auto-escalated based on time and priority
   */
  shouldAutoEscalate(incident: any): boolean {
    const rule = this.escalationRules.find(r => r.priority === incident.priority);
    if (!rule || !rule.autoEscalate) return false;

    const incidentAge = Date.now() - new Date(incident.createdAt).getTime();
    const ageInMinutes = incidentAge / (1000 * 60);

    // Auto-escalate if unassigned for too long
    if (incident.status === 'pending' && ageInMinutes > rule.timeThreshold) {
      return true;
    }

    // Auto-escalate critical incidents with emergency keywords immediately
    if (incident.priority === 'critical' && 
        this.hasEmergencyKeywords(incident.title, incident.description) &&
        ageInMinutes > 5) {
      return true;
    }

    return false;
  }

  /**
   * Manual escalation of incident
   */
  async escalateIncident(
    incidentId: string, 
    escalatedBy: string, 
    reason: string,
    targetLevel?: number
  ): Promise<any> {
    try {
      const incident = await this.storage.getIncident(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      const user = await this.storage.getUser(escalatedBy.toString());
      if (!user) {
        throw new Error('User not found');
      }

      const currentLevel = (incident as any).escalationLevel || 0;
      const userLevel = this.getUserEscalationLevel((user as any).role);
      
      // Determine new escalation level
      let newLevel = targetLevel || (currentLevel + 1);
      if (newLevel > 3) newLevel = 3; // Max level is 3 (Main Admin)

      // Users can only escalate to their level or higher
      if (newLevel <= userLevel) {
        throw new Error('Cannot escalate to a level at or below your authority');
      }

      // Update incident with escalation information
      const updatedIncident = await this.storage.updateIncident(incidentId, {
        status: 'escalated',
        escalationLevel: newLevel,
        escalatedBy: escalatedBy,
        escalatedAt: new Date(),
        escalationReason: reason
      } as any);

      // Send notifications to users at the target escalation level
      await this.notifyEscalationLevel(updatedIncident, newLevel, user);

      // Log escalation audit
      await this.storage.createAuditLog({
        userId: escalatedBy.toString(),
        action: 'update',
        entityType: 'incident',
        entityId: incidentId,
        details: JSON.stringify({
          escalation: {
            fromLevel: currentLevel,
            toLevel: newLevel,
            reason: reason,
            escalatedBy: `${(user as any).firstName} ${(user as any).lastName}`,
            escalatedAt: new Date().toISOString()
          }
        }),
        ipAddress: '',
        userAgent: ''
      });

      return updatedIncident;
    } catch (error) {
      console.error('Error escalating incident:', error);
      throw error;
    }
  }

  /**
   * Auto-escalate incidents based on rules
   */
  async checkAutoEscalation(): Promise<void> {
    try {
      const incidents = await this.storage.getAllIncidents();
      
      for (const incident of incidents) {
        if ((incident as any).status === 'resolved' || (incident as any).status === 'escalated') {
          continue; // Skip resolved or already escalated incidents
        }

        if (this.shouldAutoEscalate(incident)) {
          const currentLevel = (incident as any).escalationLevel || 0;
          const newLevel = Math.min(currentLevel + 1, 3);

          await this.storage.updateIncident((incident as any).id, {
            status: 'escalated',
            escalationLevel: newLevel,
            escalatedBy: undefined, // System escalation
            escalatedAt: new Date(),
            escalationReason: 'Automatic escalation due to time threshold'
          } as any);

          // Get system user for notifications (use first main_admin)
          const mainAdmins = await this.storage.getUsersByRole('main_admin');
          const systemUser = mainAdmins[0];

          if (systemUser) {
            await this.notifyEscalationLevel(incident, newLevel, systemUser);
          }

          // Log auto-escalation
          await this.storage.createAuditLog({
            userId: undefined,
            action: 'update',
            entityType: 'incident',
            entityId: (incident as any).id,
            details: JSON.stringify({
              autoEscalation: {
                fromLevel: currentLevel,
                toLevel: newLevel,
                reason: 'Automatic escalation due to time threshold',
                trigger: 'system',
                escalatedAt: new Date().toISOString()
              }
            }),
            ipAddress: '',
            userAgent: ''
          });

          console.log(`Auto-escalated incident ${(incident as any).id} from level ${currentLevel} to ${newLevel}`);
        }
      }
    } catch (error) {
      console.error('Error during auto-escalation check:', error);
    }
  }

  /**
   * Send notifications to users at specific escalation level
   */
  private async notifyEscalationLevel(incident: any, level: number, escalatedBy: any): Promise<void> {
    try {
      let targetUsers: any[] = [];

      switch (level) {
        case 1: // Station Admin
          if ((incident as any).stationId) {
            targetUsers = await this.storage.getUsersByStation((incident as any).stationId, 'station_admin');
          }
          break;
        case 2: // Super Admin
          if ((incident as any).organizationId) {
            targetUsers = await this.storage.getUsersByOrganization((incident as any).organizationId, 'super_admin');
          }
          break;
        case 3: // Main Admin
          targetUsers = await this.storage.getUsersByRole('main_admin');
          break;
      }

      // Send notifications to all target users
      for (const user of targetUsers) {
        await this.sendEscalationNotification(user, incident, escalatedBy);
      }
    } catch (error) {
      console.error('Error sending escalation notifications:', error);
    }
  }

  /**
   * Send individual escalation notification
   */
  private async sendEscalationNotification(user: any, incident: any, escalatedBy: any): Promise<void> {
    try {
      const escalationLevelName = this.getEscalationLevelName((incident as any).escalationLevel);
      const escalatedByName = escalatedBy ? `${escalatedBy.firstName} ${escalatedBy.lastName}` : 'System';
      
              await this.storage.createNotification({
          userId: user.id,
          title: `Incident Escalated to ${escalationLevelName}`,
          message: `Incident "${(incident as any).title}" has been escalated to ${escalationLevelName} level by ${escalatedByName}. Priority: ${(incident as any).priority}. Please review immediately.`,
          type: 'INCIDENT_ESCALATED',
          isRead: false,
          actionRequired: true
        });

      console.log(`Escalation notification sent to ${user.firstName} ${user.lastName} (${user.role})`);
    } catch (error) {
      console.error('Error sending escalation notification:', error);
    }
  }

  /**
   * Get human-readable escalation level name
   */
  private getEscalationLevelName(level: number): string {
    switch (level) {
      case 0: return 'Station Staff';
      case 1: return 'Station Admin';
      case 2: return 'Super Admin';
      case 3: return 'Main Admin';
      default: return 'Unknown Level';
    }
  }

  /**
   * Get escalation statistics
   */
  async getEscalationStats(): Promise<any> {
    try {
      const allIncidents = await this.storage.getAllIncidents();
      
      const escalationStats = {
        totalEscalated: 0,
        byLevel: { 0: 0, 1: 0, 2: 0, 3: 0 },
        byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
        averageEscalationTime: 0,
        pendingEscalations: 0
      };

      let totalEscalationTime = 0;
      let escalatedCount = 0;

      for (const incident of allIncidents) {
        const level = (incident as any).escalationLevel || 0;
        (escalationStats.byLevel as any)[level]++;

        if ((incident as any).status === 'escalated') {
          escalationStats.totalEscalated++;
          (escalationStats.byPriority as any)[(incident as any).priority]++;
          
          if ((incident as any).escalatedAt && (incident as any).createdAt) {
            const escalationTime = new Date((incident as any).escalatedAt).getTime() - new Date((incident as any).createdAt).getTime();
            totalEscalationTime += escalationTime;
            escalatedCount++;
          }
        }

        if ((incident as any).status === 'escalated' && !(incident as any).assignedToId) {
          escalationStats.pendingEscalations++;
        }
      }

      if (escalatedCount > 0) {
        escalationStats.averageEscalationTime = Math.round(totalEscalationTime / escalatedCount / (1000 * 60)); // in minutes
      }

      return escalationStats;
    } catch (error) {
      console.error('Error getting escalation stats:', error);
      return null;
    }
  }

  /**
   * Start auto-escalation scheduler (run every 5 minutes)
   */
  startAutoEscalationScheduler(): void {
    
    
    // Run immediately
    this.checkAutoEscalation();
    
    // Then run every 5 minutes
    setInterval(() => {
      this.checkAutoEscalation();
    }, 5 * 60 * 1000); // 5 minutes
  }
}