import { 
  User, 
  Organization, 
  Station, 
  Incident, 
  Invitation, 
  AuditLog, 
  FileUpload, 
  Notification,
  EmergencyContact,
  InsertUser,
  InsertOrganization,
  InsertStation,
  InsertIncident,
  InsertInvitation,
  InsertAuditLog,
  InsertFileUpload,
  InsertNotification,
  InsertEmergencyContact
} from '../shared/models';
import { sequelize } from './db';
import { QueryTypes } from 'sequelize';

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByOrganization(orgId: string, role?: string): Promise<User[]>;
  getUsersByStation(stationId: string, role?: string): Promise<User[]>;

  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  getAllOrganizations(): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<Organization>;
  deleteOrganization(id: string): Promise<void>;

  // Station operations
  getStation(id: string): Promise<Station | undefined>;
  getStationsByOrganization(orgId: string): Promise<Station[]>;
  getAllStationsWithDetails(): Promise<any[]>;
  createStation(station: InsertStation): Promise<Station>;
  updateStation(id: string, updates: Partial<InsertStation>): Promise<Station>;

  // Incident operations
  getIncident(id: string): Promise<Incident | undefined>;
  getAllIncidents(): Promise<Incident[]>;
  getIncidentsByOrganization(orgId: string): Promise<Incident[]>;
  getIncidentsByStation(stationId: string): Promise<Incident[]>;
  getIncidentsByAssignee(userId: string): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: string, updates: Partial<InsertIncident>): Promise<Incident>;
  getIncidentStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  }>;
  getIncidentStatsByOrganization(orgId: number): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  }>;
  getIncidentStatsByStation(stationId: number): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  }>;
  
  // Performance analytics methods
  getIncidentsWithFilter(whereClause: any): Promise<Incident[]>;
  getAllStations(): Promise<Station[]>;

  // Invitation operations
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitation(token: string): Promise<Invitation | undefined>;
  getInvitationById(id: number): Promise<Invitation | undefined>;
  getInvitationsList(): Promise<Invitation[]>;
  getInvitationsByUser(userId: string): Promise<Invitation[]>;
  markInvitationAsUsed(token: string): Promise<void>;
  deleteExpiredInvitations(): Promise<void>;
  deleteInvitation(id: number): Promise<void>;

  // Audit log operations
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number, offset?: number): Promise<AuditLog[]>;
  getAuditLogsByUser(userId: number): Promise<AuditLog[]>;
  getAuditLogsByEntity(entityType: string, entityId: number): Promise<AuditLog[]>;

  // File upload operations
  createFileUpload(fileUpload: InsertFileUpload): Promise<FileUpload>;
  getFileUpload(id: number): Promise<FileUpload | undefined>;
  getFileUploadsByUser(userId: number): Promise<FileUpload[]>;
  getFileUploadsByEntity(entityType: string, entityId: number): Promise<FileUpload[]>;
  updateFileUpload(id: number, updates: Partial<InsertFileUpload>): Promise<FileUpload>;
  deleteFileUpload(id: number): Promise<void>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  getUnreadNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  deleteNotification(id: number): Promise<void>;

  // Emergency Contact operations  
  getEmergencyContactsByUser(userId: string): Promise<EmergencyContact[]>;
  createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact>;
  updateEmergencyContact(id: string, userId: string, updates: Partial<InsertEmergencyContact>): Promise<EmergencyContact | null>;
  deleteEmergencyContact(id: string, userId: string): Promise<boolean>;
}

// Type aliases for easier usage
export type { 
  User, 
  Organization, 
  Station, 
  Incident, 
  Invitation, 
  AuditLog, 
  FileUpload, 
  Notification,
  EmergencyContact,
  InsertUser,
  InsertOrganization,
  InsertStation,
  InsertIncident,
  InsertInvitation,
  InsertAuditLog,
  InsertFileUpload,
  InsertNotification,
  InsertEmergencyContact
};

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const users = await sequelize.query(
      'SELECT * FROM users WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );
    return users.length > 0 ? users[0] as User : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await sequelize.query(
      'SELECT * FROM users WHERE email = :email',
      {
        replacements: { email },
        type: QueryTypes.SELECT
      }
    );
    return users.length > 0 ? users[0] as User : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await sequelize.query(
      `INSERT INTO users (
        id, email, password, "firstName", "lastName", phone, role, 
        "organisationId", "stationId", "isActive", "isInvited", "invitedBy", 
        "invitedAt", "lastLoginAt", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), :email, :password, :firstName, :lastName, :phone, :role,
        :organisationId, :stationId, :isActive, :isInvited, :invitedBy,
        :invitedAt, :lastLoginAt, NOW(), NOW()
      ) RETURNING *`,
      {
        replacements: {
          email: insertUser.email,
          password: insertUser.password,
          firstName: insertUser.firstName || '',
          lastName: insertUser.lastName || '',
          phone: insertUser.phone || null,
          role: insertUser.role,
          organisationId: insertUser.organisationId || null,
          stationId: insertUser.stationId || null,
          isActive: insertUser.isActive ?? true,
          isInvited: insertUser.isInvited ?? false,
          invitedBy: insertUser.invitedBy || null,
          invitedAt: insertUser.invitedAt || null,
          lastLoginAt: insertUser.lastLoginAt || null
        },
        type: QueryTypes.SELECT
      }
    );
    return result[0] as User;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const setClause = Object.keys(updates)
      .map(key => {
        const dbKey = key === 'firstName' ? '"firstName"' : 
                     key === 'lastName' ? '"lastName"' :
                     key === 'email' ? 'email' :
                     key === 'phone' ? 'phone' :
                     key === 'role' ? 'role' :
                     key === 'organisationId' ? '"organisationId"' :
                     key === 'stationId' ? '"stationId"' :
                     key === 'isActive' ? '"isActive"' :
                     key === 'isInvited' ? '"isInvited"' :
                     key === 'invitedBy' ? '"invitedBy"' :
                     key === 'invitedAt' ? '"invitedAt"' :
                     key === 'lastLoginAt' ? '"lastLoginAt"' : key;
        return `${dbKey} = :${key}`;
      })
      .join(', ');

    // Clean up UUID fields - convert empty strings to null
    const cleanedUpdates = { ...updates };
    if (cleanedUpdates.organisationId === "") cleanedUpdates.organisationId = null;
    if (cleanedUpdates.stationId === "") cleanedUpdates.stationId = null;

    await sequelize.query(
      `UPDATE users SET ${setClause}, "updatedAt" = NOW() WHERE id = :id`,
      {
        replacements: { ...cleanedUpdates, id },
        type: QueryTypes.UPDATE
      }
    );

    const result = await sequelize.query(
      'SELECT * FROM users WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );
    
    return result[0] as User;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const users = await sequelize.query(
      'SELECT * FROM users WHERE role = :role AND "isActive" = true',
      {
        replacements: { role },
        type: QueryTypes.SELECT
      }
    );
    return users as User[];
  }

  async getUsersByOrganization(orgId: string, role?: string): Promise<User[]> {
    let query = 'SELECT * FROM users WHERE "organisationId" = :orgId AND "isActive" = true';
    const replacements: any = { orgId };

    if (role) {
      query += ' AND role = :role';
      replacements.role = role;
    }

    const users = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });
    return users as User[];
  }

  async getUsersByStation(stationId: string, role?: string): Promise<User[]> {
    let query = 'SELECT * FROM users WHERE "stationId" = :stationId AND "isActive" = true';
    const replacements: any = { stationId };

    if (role) {
      query += ' AND role = :role';
      replacements.role = role;
    }

    const users = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });
    return users as User[];
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const organizations = await sequelize.query(
      'SELECT * FROM organizations WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );
    return organizations.length > 0 ? organizations[0] as Organization : undefined;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    const organizations = await sequelize.query(
      'SELECT * FROM organizations ORDER BY created_at DESC',
      {
        type: QueryTypes.SELECT
      }
    );
    return organizations as Organization[];
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const result = await sequelize.query(
      'INSERT INTO organizations (name, type, description, created_at) VALUES (:name, :type, :description, NOW()) RETURNING *',
      {
        replacements: {
          name: org.name,
          type: org.type,
          description: org.description || null
        },
        type: QueryTypes.SELECT
      }
    );
    return result[0] as Organization;
  }

  async updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization> {
    const setClause = Object.keys(updates)
      .map(key => `${key} = :${key}`)
      .join(', ');

    await sequelize.query(
      `UPDATE organizations SET ${setClause} WHERE id = :id`,
      {
        replacements: { ...updates, id },
        type: QueryTypes.UPDATE
      }
    );

    const result = await sequelize.query(
      'SELECT * FROM organizations WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );

    if (result.length === 0) throw new Error('Organization not found');
    return result[0] as Organization;
  }

  async deleteOrganization(id: number): Promise<void> {
    const result = await sequelize.query(
      'DELETE FROM organizations WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.DELETE
      }
    );
    if (result[1] === 0) throw new Error('Organization not found');
  }

  async getStation(id: string): Promise<Station | undefined> {
    const stations = await sequelize.query(
      'SELECT * FROM stations WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );
    return stations.length > 0 ? stations[0] as Station : undefined;
  }

  async getStationsByOrganization(orgId: number): Promise<Station[]> {
    const stations = await sequelize.query(
      'SELECT * FROM stations WHERE "organizationId" = :orgId ORDER BY created_at DESC',
      {
        replacements: { orgId },
        type: QueryTypes.SELECT
      }
    );
    return stations as Station[];
  }

  async getAllStationsWithDetails(): Promise<any[]> {
    // Get all stations with organization information
    const stations = await sequelize.query(
      `SELECT 
        s.*, 
        o.name as organization_name, 
        o.type as organization_type
      FROM stations s 
      LEFT JOIN organizations o ON s."organizationId" = o.id 
      ORDER BY s.created_at DESC`,
      {
        type: QueryTypes.SELECT
      }
    );

    // Get user counts and incident counts for each station
    const enrichedStations = await Promise.all(
      (stations as any[]).map(async (station: any) => {
        const [staffCountResult, activeIncidentsResult] = await Promise.all([
          sequelize.query(
            'SELECT COUNT(*) as count FROM users WHERE "stationId" = :stationId AND "isActive" = true',
            {
              replacements: { stationId: station.id },
              type: QueryTypes.SELECT
            }
          ),
          sequelize.query(
            'SELECT COUNT(*) as count FROM incidents WHERE "stationId" = :stationId AND status IN (\'pending\', \'assigned\', \'in_progress\')',
            {
              replacements: { stationId: station.id },
              type: QueryTypes.SELECT
            }
          )
        ]);

        const staffCount = (staffCountResult[0] as any).count;
        const activeIncidents = (activeIncidentsResult[0] as any).count;

        return {
          id: station.id,
          name: station.name,
          district: station.district,
          sector: station.sector,
          organizationName: station.organization_name || 'Unknown',
          organizationType: station.organization_type || 'Unknown',
          contactNumber: station.contactNumber,
          capacity: station.capacity,
          currentStaff: parseInt(staffCount),
          activeIncidents: parseInt(activeIncidents),
          createdAt: station.created_at || station.createdAt
        };
      })
    );

    return enrichedStations;
  }

  async createStation(station: InsertStation): Promise<Station> {
    const result = await sequelize.query(
      `INSERT INTO stations (
        name, district, sector, "organizationId", "contactNumber", 
        capacity, created_at
      ) VALUES (
        :name, :district, :sector, :organizationId, :contactNumber, 
        :capacity, NOW()
      ) RETURNING *`,
      {
        replacements: {
          name: station.name,
          district: station.district,
          sector: station.sector,
          organizationId: station.organizationId,
          contactNumber: station.contactNumber || null,
          capacity: station.capacity || null
        },
        type: QueryTypes.SELECT
      }
    );
    return result[0] as Station;
  }

  async updateStation(id: number, updates: Partial<InsertStation>): Promise<Station> {
    const setClause = Object.keys(updates)
      .map(key => {
        const dbKey = key === 'organizationId' ? '"organizationId"' :
                     key === 'contactNumber' ? '"contactNumber"' : key;
        return `${dbKey} = :${key}`;
      })
      .join(', ');

    await sequelize.query(
      `UPDATE stations SET ${setClause} WHERE id = :id`,
      {
        replacements: { ...updates, id },
        type: QueryTypes.UPDATE
      }
    );

    const result = await sequelize.query(
      'SELECT * FROM stations WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );

    if (result.length === 0) throw new Error('Station not found');
    return result[0] as Station;
  }

  async getIncident(id: string): Promise<Incident | undefined> {
    const incidents = await sequelize.query(
      'SELECT * FROM incidents WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );
    return incidents.length > 0 ? incidents[0] as Incident : undefined;
  }

  async getAllIncidents(): Promise<Incident[]> {
    const incidents = await sequelize.query(
      'SELECT * FROM incidents ORDER BY "createdAt" DESC',
      {
        type: QueryTypes.SELECT
      }
    );
    return incidents as Incident[];
  }

  async getIncidentsByOrganization(orgId: number): Promise<Incident[]> {
    const incidents = await sequelize.query(
      'SELECT * FROM incidents WHERE "organisationId" = :orgId ORDER BY "createdAt" DESC',
      {
        replacements: { orgId },
        type: QueryTypes.SELECT
      }
    );
    return incidents as Incident[];
  }

  async getIncidentsByStation(stationId: number): Promise<Incident[]> {
    const incidents = await sequelize.query(
      'SELECT * FROM incidents WHERE "stationId" = :stationId ORDER BY "createdAt" DESC',
      {
        replacements: { stationId },
        type: QueryTypes.SELECT
      }
    );
    return incidents as Incident[];
  }

  async getIncidentsByAssignee(userId: number): Promise<Incident[]> {
    const incidents = await sequelize.query(
      'SELECT * FROM incidents WHERE "assignedToId" = :userId ORDER BY "createdAt" DESC',
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    return incidents as Incident[];
  }

  async createIncident(incident: InsertIncident): Promise<Incident> {
    const result = await sequelize.query(
      `INSERT INTO incidents (
        id, title, description, type, priority, status, location, "stationId", 
        "organisationId", "reportedById", "reported_by", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), :title, :description, :type, :priority, :status, :location, :stationId,
        :organisationId, :reportedById, :reportedBy, NOW(), NOW()
      ) RETURNING *`,
      {
        replacements: {
          title: incident.title,
          description: incident.description,
          type: incident.type || 'other',
          priority: incident.priority || 'medium',
          status: incident.status || 'reported',
          location: JSON.stringify(incident.location || {}),
          stationId: incident.stationId,
          organisationId: incident.organisationId || null,
          reportedById: incident.reportedById,
          reportedBy: incident.reportedBy || 'Citizen Report'
        },
        type: QueryTypes.SELECT
      }
    );
    return result[0] as Incident;
  }

  async updateIncident(id: string, updates: Partial<InsertIncident>): Promise<Incident> {
    // Filter out undefined values to prevent SQL replacement errors
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key, value]) => value !== undefined)
    );

    if (Object.keys(filteredUpdates).length === 0) {
      // If no valid updates, just return the existing incident
      const result = await sequelize.query(
        'SELECT * FROM incidents WHERE id = :id',
        {
          replacements: { id },
          type: QueryTypes.SELECT
        }
      );
      return result[0] as Incident;
    }

    const setClause = Object.keys(filteredUpdates)
      .map(key => {
        const dbKey = key === 'reportedById' ? '"reportedById"' :
                     key === 'organisationId' ? '"organisationId"' :
                     key === 'stationId' ? '"stationId"' :
                     key === 'assignedTo' ? '"assignedTo"' :
                     key === 'assignedToId' ? '"assignedTo"' :
                     key === 'locationLat' ? '"locationLat"' :
                     key === 'locationLng' ? '"locationLng"' :
                     key === 'locationAddress' ? '"locationAddress"' :
                     key === 'photoUrl' ? '"photoUrl"' :
                     key === 'escalatedBy' ? '"escalatedBy"' :
                     key === 'escalatedAt' ? '"escalatedAt"' :
                     key === 'escalationReason' ? '"escalationReason"' :
                     key === 'escalationLevel' ? '"escalationLevel"' :
                     key === 'resolvedBy' ? '"resolvedBy"' :
                     key === 'resolvedAt' ? '"resolvedAt"' : key;
        return `${dbKey} = :${key}`;
      })
      .join(', ');

    await sequelize.query(
      `UPDATE incidents SET ${setClause}, "updatedAt" = NOW() WHERE id = :id`,
      {
        replacements: { ...filteredUpdates, id },
        type: QueryTypes.UPDATE
      }
    );

    const result = await sequelize.query(
      'SELECT * FROM incidents WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );

    if (result.length === 0) throw new Error('Incident not found');
    return result[0] as Incident;
  }

  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const result = await sequelize.query(
      `INSERT INTO invitations (
        email, token, role, organization_id, station_id, invited_by, 
        is_used, expires_at, created_at
      ) VALUES (
        :email, :token, :role, :organizationId, :stationId, :invitedBy,
        :isUsed, :expiresAt, NOW()
      ) RETURNING *`,
      {
        replacements: {
          email: invitation.email,
          token: invitation.token,
          role: invitation.role,
          organizationId: invitation.organizationId || null,
          stationId: invitation.stationId || null,
          invitedBy: invitation.invitedBy,
          isUsed: invitation.isUsed ?? false,
          expiresAt: invitation.expiresAt
        },
        type: QueryTypes.SELECT
      }
    );
    return result[0] as Invitation;
  }

  async getInvitation(token: string): Promise<Invitation | undefined> {
    const invitations = await sequelize.query(
      'SELECT * FROM invitations WHERE token = :token',
      {
        replacements: { token },
        type: QueryTypes.SELECT
      }
    );
    return invitations.length > 0 ? invitations[0] as Invitation : undefined;
  }

  async getInvitationById(id: number): Promise<Invitation | undefined> {
    const invitations = await sequelize.query(
      'SELECT * FROM invitations WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );
    return invitations.length > 0 ? invitations[0] as Invitation : undefined;
  }

  async getInvitationsList(): Promise<Invitation[]> {
    const invitations = await sequelize.query(
      'SELECT * FROM invitations ORDER BY created_at DESC',
      {
        type: QueryTypes.SELECT
      }
    );
    return invitations as Invitation[];
  }

  async getInvitationsByUser(userId: string): Promise<Invitation[]> {
    const invitations = await sequelize.query(
      'SELECT * FROM invitations WHERE invited_by = :userId ORDER BY created_at DESC',
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    return invitations as Invitation[];
  }

  async markInvitationAsUsed(token: string): Promise<void> {
    await sequelize.query(
      'UPDATE invitations SET is_used = true WHERE token = :token',
      {
        replacements: { token },
        type: QueryTypes.UPDATE
      }
    );
  }

  async deleteExpiredInvitations(): Promise<void> {
    await sequelize.query(
      'DELETE FROM invitations WHERE is_used = false AND expires_at < NOW()',
      {
        type: QueryTypes.DELETE
      }
    );
  }

  async deleteInvitation(id: number): Promise<void> {
    await sequelize.query(
      'DELETE FROM invitations WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.DELETE
      }
    );
  }

  async createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog> {
    const result = await sequelize.query(
      `INSERT INTO audit_logs (
        id, "user_id", action, "resource_type", "resource_id", details, 
        "ip_address", "user_agent", "created_at", "updated_at"
      ) VALUES (
        gen_random_uuid(), :userId, :action, :resourceType, :resourceId, :details,
        :ipAddress, :userAgent, NOW(), NOW()
      ) RETURNING *`,
      {
        replacements: {
          userId: auditLog.userId || null,
          action: auditLog.action,
          resourceType: auditLog.resourceType || null,
          resourceId: auditLog.resourceId || null,
          details: typeof auditLog.details === 'string' ? auditLog.details : JSON.stringify(auditLog.details),
          ipAddress: auditLog.ipAddress || null,
          userAgent: auditLog.userAgent || null
        },
        type: QueryTypes.SELECT
      }
    );
    return result[0] as AuditLog;
  }

  async getAuditLogs(limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
    const auditLogs = await sequelize.query(
      `SELECT 
        al.*, 
        u."firstName", u."lastName", u.email, u.role
      FROM audit_logs al 
      LEFT JOIN users u ON al."user_id" = u.id 
      ORDER BY al."created_at" DESC 
      LIMIT :limit OFFSET :offset`,
      {
        replacements: { limit, offset },
        type: QueryTypes.SELECT
      }
    );
    return auditLogs as AuditLog[];
  }

  async getAuditLogsByUser(userId: number): Promise<AuditLog[]> {
    const auditLogs = await sequelize.query(
      'SELECT * FROM audit_logs WHERE "user_id" = :userId ORDER BY "created_at" DESC',
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    return auditLogs as AuditLog[];
  }

  async getAuditLogsByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    const auditLogs = await sequelize.query(
      'SELECT * FROM audit_logs WHERE "resource_type" = :entityType AND "resource_id" = :entityId ORDER BY "created_at" DESC',
      {
        replacements: { entityType, entityId },
        type: QueryTypes.SELECT
      }
    );
    return auditLogs as AuditLog[];
  }

  async createFileUpload(fileUpload: InsertFileUpload): Promise<FileUpload> {
    const result = await sequelize.query(
      `INSERT INTO file_uploads (
        filename, "originalName", "mimeType", size, path, 
        "uploadedBy", "entityType", "entityId", "createdAt"
      ) VALUES (
        :filename, :originalName, :mimeType, :size, :path,
        :uploadedBy, :entityType, :entityId, NOW()
      ) RETURNING *`,
      {
        replacements: {
          filename: fileUpload.filename,
          originalName: fileUpload.originalName,
          mimeType: fileUpload.mimeType,
          size: fileUpload.size,
          path: fileUpload.path,
          uploadedBy: fileUpload.uploadedBy,
          entityType: fileUpload.entityType || null,
          entityId: fileUpload.entityId || null
        },
        type: QueryTypes.SELECT
      }
    );
    return result[0] as FileUpload;
  }

  async getFileUpload(id: number): Promise<FileUpload | undefined> {
    const uploads = await sequelize.query(
      'SELECT * FROM file_uploads WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );
    return uploads.length > 0 ? uploads[0] as FileUpload : undefined;
  }

  async getFileUploadsByUser(userId: number): Promise<FileUpload[]> {
    const uploads = await sequelize.query(
      'SELECT * FROM file_uploads WHERE "uploadedBy" = :userId ORDER BY "createdAt" DESC',
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    return uploads as FileUpload[];
  }

  async getFileUploadsByEntity(entityType: string, entityId: number): Promise<FileUpload[]> {
    const uploads = await sequelize.query(
      'SELECT * FROM file_uploads WHERE "entityType" = :entityType AND "entityId" = :entityId ORDER BY "createdAt" DESC',
      {
        replacements: { entityType, entityId },
        type: QueryTypes.SELECT
      }
    );
    return uploads as FileUpload[];
  }

  async updateFileUpload(id: number, updates: Partial<InsertFileUpload>): Promise<FileUpload> {
    const setClause = Object.keys(updates)
      .map(key => {
        const dbKey = key === 'originalName' ? '"originalName"' :
                     key === 'mimeType' ? '"mimeType"' :
                     key === 'uploadedBy' ? '"uploadedBy"' :
                     key === 'entityType' ? '"entityType"' :
                     key === 'entityId' ? '"entityId"' : key;
        return `${dbKey} = :${key}`;
      })
      .join(', ');

    await sequelize.query(
      `UPDATE file_uploads SET ${setClause} WHERE id = :id`,
      {
        replacements: { ...updates, id },
        type: QueryTypes.UPDATE
      }
    );

    const result = await sequelize.query(
      'SELECT * FROM file_uploads WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );

    if (result.length === 0) throw new Error('File upload not found');
    return result[0] as FileUpload;
  }

  async deleteFileUpload(id: number): Promise<void> {
    await sequelize.query(
      'DELETE FROM file_uploads WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.DELETE
      }
    );
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await sequelize.query(
      `INSERT INTO notifications (
        "user_id", type, title, message, data, read, priority, "created_at", "updated_at"
      ) VALUES (
        :userId, :type, :title, :message, :data, :read, :priority, NOW(), NOW()
      ) RETURNING *`,
      {
        replacements: {
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.relatedEntityType && notification.relatedEntityId ? 
            { entityType: notification.relatedEntityType, entityId: notification.relatedEntityId } : {},
          read: notification.isRead ?? false,
          priority: 'low'
        },
        type: QueryTypes.SELECT
      }
    );
    return result[0] as Notification;
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    const notifications = await sequelize.query(
      'SELECT * FROM notifications WHERE "user_id" = :userId ORDER BY "created_at" DESC',
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    return notifications as Notification[];
  }

  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    const notifications = await sequelize.query(
      'SELECT * FROM notifications WHERE "user_id" = :userId AND read = false ORDER BY "created_at" DESC',
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    return notifications as Notification[];
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await sequelize.query(
      'UPDATE notifications SET read = true WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.UPDATE
      }
    );
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await sequelize.query(
      'UPDATE notifications SET read = true WHERE "user_id" = :userId',
      {
        replacements: { userId },
        type: QueryTypes.UPDATE
      }
    );
  }

  async getNotificationById(id: number): Promise<any> {
    const result = await sequelize.query(
      'SELECT * FROM notifications WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );
    return result[0] || null;
  }

  async deleteNotification(id: number): Promise<void> {
    await sequelize.query(
      'DELETE FROM notifications WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.DELETE
      }
    );
  }

  async getIncidentStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  }> {
    const [totalResult, pendingResult, inProgressResult, resolvedResult] = await Promise.all([
      sequelize.query('SELECT COUNT(*) as count FROM incidents', { type: QueryTypes.SELECT }),
      sequelize.query('SELECT COUNT(*) as count FROM incidents WHERE status IN (\'pending\', \'assigned\')', { type: QueryTypes.SELECT }),
      sequelize.query('SELECT COUNT(*) as count FROM incidents WHERE status = \'in_progress\'', { type: QueryTypes.SELECT }),
      sequelize.query('SELECT COUNT(*) as count FROM incidents WHERE status = \'resolved\'', { type: QueryTypes.SELECT })
    ]);

    return {
      total: parseInt((totalResult[0] as any).count),
      pending: parseInt((pendingResult[0] as any).count),
      inProgress: parseInt((inProgressResult[0] as any).count),
      resolved: parseInt((resolvedResult[0] as any).count)
    };
  }

  async getIncidentStatsByOrganization(orgId: number): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  }> {
    const [totalResult, pendingResult, inProgressResult, resolvedResult] = await Promise.all([
      sequelize.query('SELECT COUNT(*) as count FROM incidents WHERE "organisationId" = :orgId', { 
        replacements: { orgId }, 
        type: QueryTypes.SELECT 
      }),
      sequelize.query('SELECT COUNT(*) as count FROM incidents WHERE "organisationId" = :orgId AND status IN (\'pending\', \'assigned\')', { 
        replacements: { orgId }, 
        type: QueryTypes.SELECT 
      }),
      sequelize.query('SELECT COUNT(*) as count FROM incidents WHERE "organisationId" = :orgId AND status = \'in_progress\'', { 
        replacements: { orgId }, 
        type: QueryTypes.SELECT 
      }),
      sequelize.query('SELECT COUNT(*) as count FROM incidents WHERE "organisationId" = :orgId AND status = \'resolved\'', { 
        replacements: { orgId }, 
        type: QueryTypes.SELECT 
      })
    ]);

    return {
      total: parseInt((totalResult[0] as any).count),
      pending: parseInt((pendingResult[0] as any).count),
      inProgress: parseInt((inProgressResult[0] as any).count),
      resolved: parseInt((resolvedResult[0] as any).count)
    };
  }

  async getIncidentStatsByStation(stationId: number): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
  }> {
    const [totalResult, pendingResult, inProgressResult, resolvedResult] = await Promise.all([
      sequelize.query('SELECT COUNT(*) as count FROM incidents WHERE "stationId" = :stationId', { 
        replacements: { stationId }, 
        type: QueryTypes.SELECT 
      }),
      sequelize.query('SELECT COUNT(*) as count FROM incidents WHERE "stationId" = :stationId AND status IN (\'pending\', \'assigned\')', { 
        replacements: { stationId }, 
        type: QueryTypes.SELECT 
      }),
      sequelize.query('SELECT COUNT(*) as count FROM incidents WHERE "stationId" = :stationId AND status = \'in_progress\'', { 
        replacements: { stationId }, 
        type: QueryTypes.SELECT 
      }),
      sequelize.query('SELECT COUNT(*) as count FROM incidents WHERE "stationId" = :stationId AND status = \'resolved\'', { 
        replacements: { stationId }, 
        type: QueryTypes.SELECT 
      })
    ]);

    return {
      total: parseInt((totalResult[0] as any).count),
      pending: parseInt((pendingResult[0] as any).count),
      inProgress: parseInt((inProgressResult[0] as any).count),
      resolved: parseInt((resolvedResult[0] as any).count)
    };
  }

  // Emergency Contact operations
  async getEmergencyContactsByUser(userId: string): Promise<EmergencyContact[]> {
    const contacts = await sequelize.query(
      'SELECT * FROM emergency_contacts WHERE user_id = :userId ORDER BY created_at DESC',
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    return contacts as EmergencyContact[];
  }

  async createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact> {
    try {
      console.log('Creating emergency contact with data:', contact);
      
      const result = await sequelize.query(
        `INSERT INTO emergency_contacts (
          id, user_id, name, phone, relationship, priority, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), :userId, :name, :phone, :relationship, 1, NOW(), NOW()
        ) RETURNING *`,
        {
          replacements: {
            userId: contact.userId,
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship
          },
          type: QueryTypes.SELECT
        }
      );
      
      console.log('Emergency contact created successfully:', result[0]);
      return result[0] as EmergencyContact;
    } catch (error) {
      console.error('Error creating emergency contact:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        original: error.original,
        sql: error.sql
      });
      throw error;
    }
  }

  async updateEmergencyContact(id: string, userId: string, updates: Partial<InsertEmergencyContact>): Promise<EmergencyContact | null> {
    // First verify the contact belongs to the user
    const existing = await sequelize.query(
      'SELECT * FROM emergency_contacts WHERE id = :id AND user_id = :userId',
      {
        replacements: { id, userId },
        type: QueryTypes.SELECT
      }
    );

    if (existing.length === 0) {
      return null; // Contact not found or doesn't belong to user
    }

    // Build SET clause for valid columns only
    const validColumns = ['name', 'phone', 'relationship', 'email', 'address', 'notes'];
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key, value]) => 
        validColumns.includes(key) && value !== undefined
      )
    );

    if (Object.keys(filteredUpdates).length === 0) {
      return existing[0] as EmergencyContact;
    }

    const setClause = Object.keys(filteredUpdates)
      .map(key => `${key} = :${key}`)
      .join(', ');

    const result = await sequelize.query(
      `UPDATE emergency_contacts SET ${setClause}, updated_at = NOW() WHERE id = :id AND user_id = :userId RETURNING *`,
      {
        replacements: { ...filteredUpdates, id, userId },
        type: QueryTypes.SELECT
      }
    );

    return result.length > 0 ? result[0] as EmergencyContact : null;
  }

  async deleteEmergencyContact(id: string, userId: string): Promise<boolean> {
    const result = await sequelize.query(
      'DELETE FROM emergency_contacts WHERE id = :id AND user_id = :userId',
      {
        replacements: { id, userId },
        type: QueryTypes.DELETE
      }
    );
    // result[1] is the number of affected rows for DELETE queries
    return (result[1] as number) > 0;
  }

  // Performance analytics methods
  async getIncidentsWithFilter(whereClause: any): Promise<Incident[]> {
    // Convert Sequelize where clause to SQL conditions
    const conditions: string[] = [];
    const replacements: any = {};

    if (whereClause.status) {
      if (Array.isArray(whereClause.status)) {
        conditions.push(`status IN (${whereClause.status.map((_, i) => `:status${i}`).join(', ')})`);
        whereClause.status.forEach((status: string, i: number) => {
          replacements[`status${i}`] = status;
        });
      } else {
        conditions.push('status = :status');
        replacements.status = whereClause.status;
      }
    }

    if (whereClause.organisationId) {
      conditions.push('"organisationId" = :organisationId');
      replacements.organisationId = whereClause.organisationId;
    }

    if (whereClause.stationId) {
      conditions.push('"stationId" = :stationId');
      replacements.stationId = whereClause.stationId;
    }

    if (whereClause.priority) {
      conditions.push('priority = :priority');
      replacements.priority = whereClause.priority;
    }

    if (whereClause.createdAt) {
      if (whereClause.createdAt.gte) {
        conditions.push('"createdAt" >= :createdAtGte');
        replacements.createdAtGte = whereClause.createdAt.gte;
      }
      if (whereClause.createdAt.lte) {
        conditions.push('"createdAt" <= :createdAtLte');
        replacements.createdAtLte = whereClause.createdAt.lte;
      }
    }

    const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const incidents = await sequelize.query(
      `SELECT * FROM incidents ${whereSQL} ORDER BY "createdAt" DESC`,
      {
        replacements,
        type: QueryTypes.SELECT
      }
    );
    return incidents as Incident[];
  }

  async getAllStations(): Promise<Station[]> {
    const stations = await sequelize.query(
      'SELECT * FROM stations ORDER BY name ASC',
      {
        type: QueryTypes.SELECT
      }
    );
    return stations as Station[];
  }
}

export const storage = new DatabaseStorage();