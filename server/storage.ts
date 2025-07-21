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
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByOrganization(orgId: number, role?: string): Promise<User[]>;
  getUsersByStation(stationId: number, role?: string): Promise<User[]>;

  // Organization operations
  getOrganization(id: number): Promise<Organization | undefined>;
  getAllOrganizations(): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, updates: Partial<InsertOrganization>): Promise<Organization>;
  deleteOrganization(id: number): Promise<void>;

  // Station operations
  getStation(id: number): Promise<Station | undefined>;
  getStationsByOrganization(orgId: number): Promise<Station[]>;
  getAllStationsWithDetails(): Promise<any[]>;
  createStation(station: InsertStation): Promise<Station>;
  updateStation(id: number, updates: Partial<InsertStation>): Promise<Station>;

  // Incident operations
  getIncident(id: number): Promise<Incident | undefined>;
  getAllIncidents(): Promise<Incident[]>;
  getIncidentsByOrganization(orgId: number): Promise<Incident[]>;
  getIncidentsByStation(stationId: number): Promise<Incident[]>;
  getIncidentsByAssignee(userId: number): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: number, updates: Partial<InsertIncident>): Promise<Incident>;
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
  getInvitationsByUser(userId: number): Promise<Invitation[]>;
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
  getEmergencyContactsByUser(userId: number): Promise<EmergencyContact[]>;
  createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact>;
  updateEmergencyContact(id: number, updates: Partial<InsertEmergencyContact>): Promise<EmergencyContact>;
  deleteEmergencyContact(id: number): Promise<void>;
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
        "organizationId", "stationId", "isActive", "isInvited", "invitedBy", 
        "invitedAt", "lastLoginAt", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), :email, :password, :firstName, :lastName, :phone, :role,
        :organizationId, :stationId, :isActive, :isInvited, :invitedBy,
        :invitedAt, :lastLoginAt, NOW(), NOW()
      ) RETURNING *`,
      {
        replacements: {
          email: insertUser.email,
          password: insertUser.password,
          firstName: insertUser.firstName,
          lastName: insertUser.lastName,
          phone: insertUser.phone,
          role: insertUser.role,
          organizationId: insertUser.organizationId || null,
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

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const setClause = Object.keys(updates)
      .map(key => {
        const dbKey = key === 'firstName' ? '"firstName"' : 
                     key === 'lastName' ? '"lastName"' :
                     key === 'organizationId' ? '"organizationId"' :
                     key === 'stationId' ? '"stationId"' :
                     key === 'isActive' ? '"isActive"' :
                     key === 'isInvited' ? '"isInvited"' :
                     key === 'invitedBy' ? '"invitedBy"' :
                     key === 'invitedAt' ? '"invitedAt"' :
                     key === 'lastLoginAt' ? '"lastLoginAt"' : key;
        return `${dbKey} = :${key}`;
      })
      .join(', ');

    await sequelize.query(
      `UPDATE users SET ${setClause}, "updatedAt" = NOW() WHERE id = :id`,
      {
        replacements: { ...updates, id },
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

    if (result.length === 0) throw new Error('User not found');
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

  async getUsersByOrganization(orgId: number, role?: string): Promise<User[]> {
    let query = 'SELECT * FROM users WHERE "organizationId" = :orgId AND "isActive" = true';
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

  async getUsersByStation(stationId: number, role?: string): Promise<User[]> {
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

  async getOrganization(id: number): Promise<Organization | undefined> {
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

  async getStation(id: number): Promise<Station | undefined> {
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

  async getIncident(id: number): Promise<Incident | undefined> {
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
        title, description, "reportedById", "organisationId", "stationId", 
        "assignedToId", status, priority, "locationLat", "locationLng", 
        "locationAddress", "photoUrl", notes, upvotes, "escalatedBy", 
        "escalatedAt", "escalationReason", "escalationLevel", "createdAt", "updatedAt"
      ) VALUES (
        :title, :description, :reportedById, :organisationId, :stationId,
        :assignedToId, :status, :priority, :locationLat, :locationLng,
        :locationAddress, :photoUrl, :notes, :upvotes, :escalatedBy,
        :escalatedAt, :escalationReason, :escalationLevel, NOW(), NOW()
      ) RETURNING *`,
      {
        replacements: {
          title: incident.title,
          description: incident.description,
          reportedById: incident.reportedById,
          organisationId: incident.organisationId || null,
          stationId: incident.stationId || null,
          assignedToId: incident.assignedToId || null,
          status: incident.status || 'pending',
          priority: incident.priority || 'medium',
          locationLat: incident.locationLat || null,
          locationLng: incident.locationLng || null,
          locationAddress: incident.locationAddress || null,
          photoUrl: incident.photoUrl || null,
          notes: incident.notes || null,
          upvotes: incident.upvotes || 0,
          escalatedBy: incident.escalatedBy || null,
          escalatedAt: incident.escalatedAt || null,
          escalationReason: incident.escalationReason || null,
          escalationLevel: incident.escalationLevel || null
        },
        type: QueryTypes.SELECT
      }
    );
    return result[0] as Incident;
  }

  async updateIncident(id: number, updates: Partial<InsertIncident>): Promise<Incident> {
    const setClause = Object.keys(updates)
      .map(key => {
        const dbKey = key === 'reportedById' ? '"reportedById"' :
                     key === 'organisationId' ? '"organisationId"' :
                     key === 'stationId' ? '"stationId"' :
                     key === 'assignedToId' ? '"assignedToId"' :
                     key === 'locationLat' ? '"locationLat"' :
                     key === 'locationLng' ? '"locationLng"' :
                     key === 'locationAddress' ? '"locationAddress"' :
                     key === 'photoUrl' ? '"photoUrl"' :
                     key === 'escalatedBy' ? '"escalatedBy"' :
                     key === 'escalatedAt' ? '"escalatedAt"' :
                     key === 'escalationReason' ? '"escalationReason"' :
                     key === 'escalationLevel' ? '"escalationLevel"' : key;
        return `${dbKey} = :${key}`;
      })
      .join(', ');

    await sequelize.query(
      `UPDATE incidents SET ${setClause}, "updatedAt" = NOW() WHERE id = :id`,
      {
        replacements: { ...updates, id },
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

  async getInvitationsByUser(userId: number): Promise<Invitation[]> {
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
        "userId", action, "entityType", "entityId", details, 
        "ipAddress", "userAgent", "createdAt"
      ) VALUES (
        :userId, :action, :entityType, :entityId, :details,
        :ipAddress, :userAgent, NOW()
      ) RETURNING *`,
      {
        replacements: {
          userId: auditLog.userId,
          action: auditLog.action,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          details: auditLog.details,
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
      LEFT JOIN users u ON al."userId" = u.id 
      ORDER BY al."createdAt" DESC 
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
      'SELECT * FROM audit_logs WHERE "userId" = :userId ORDER BY "createdAt" DESC',
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    return auditLogs as AuditLog[];
  }

  async getAuditLogsByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    const auditLogs = await sequelize.query(
      'SELECT * FROM audit_logs WHERE "entityType" = :entityType AND "entityId" = :entityId ORDER BY "createdAt" DESC',
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
        "userId", type, title, message, "relatedEntityType", 
        "relatedEntityId", "actionRequired", "isRead", "createdAt"
      ) VALUES (
        :userId, :type, :title, :message, :relatedEntityType,
        :relatedEntityId, :actionRequired, :isRead, NOW()
      ) RETURNING *`,
      {
        replacements: {
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          relatedEntityType: notification.relatedEntityType || null,
          relatedEntityId: notification.relatedEntityId || null,
          actionRequired: notification.actionRequired ?? false,
          isRead: notification.isRead ?? false
        },
        type: QueryTypes.SELECT
      }
    );
    return result[0] as Notification;
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    const notifications = await sequelize.query(
      'SELECT * FROM notifications WHERE "userId" = :userId ORDER BY "createdAt" DESC',
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    return notifications as Notification[];
  }

  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    const notifications = await sequelize.query(
      'SELECT * FROM notifications WHERE "userId" = :userId AND "isRead" = false ORDER BY "createdAt" DESC',
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    return notifications as Notification[];
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await sequelize.query(
      'UPDATE notifications SET "isRead" = true WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.UPDATE
      }
    );
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await sequelize.query(
      'UPDATE notifications SET "isRead" = true WHERE "userId" = :userId',
      {
        replacements: { userId },
        type: QueryTypes.UPDATE
      }
    );
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
  async getEmergencyContactsByUser(userId: number): Promise<EmergencyContact[]> {
    const contacts = await sequelize.query(
      'SELECT * FROM emergency_contacts WHERE "userId" = :userId ORDER BY "createdAt" DESC',
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );
    return contacts as EmergencyContact[];
  }

  async createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact> {
    const result = await sequelize.query(
      `INSERT INTO emergency_contacts (
        "userId", name, phone, relationship, "createdAt", "updatedAt"
      ) VALUES (
        :userId, :name, :phone, :relationship, NOW(), NOW()
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
    return result[0] as EmergencyContact;
  }

  async updateEmergencyContact(id: number, updates: Partial<InsertEmergencyContact>): Promise<EmergencyContact> {
    const setClause = Object.keys(updates)
      .map(key => {
        const dbKey = key === 'userId' ? '"userId"' : key;
        return `${dbKey} = :${key}`;
      })
      .join(', ');

    const result = await sequelize.query(
      `UPDATE emergency_contacts SET ${setClause}, "updatedAt" = NOW() WHERE id = :id RETURNING *`,
      {
        replacements: { ...updates, id },
        type: QueryTypes.SELECT
      }
    );

    if (result.length === 0) {
      throw new Error('Emergency contact not found');
    }

    return result[0] as EmergencyContact;
  }

  async deleteEmergencyContact(id: number): Promise<void> {
    const result = await sequelize.query(
      'DELETE FROM emergency_contacts WHERE id = :id',
      {
        replacements: { id },
        type: QueryTypes.DELETE
      }
    );
    if (result[1] === 0) {
      throw new Error('Emergency contact not found');
    }
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