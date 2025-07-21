import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../server/db';

export interface UserAttributes {
  id: string;
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: 'main_admin' | 'super_admin' | 'station_admin' | 'station_staff' | 'citizen';
  title?: string;
  department?: string;
  bio?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  profilePicture?: string;
  isActive: boolean;
  isInvited: boolean;
  invitedBy?: string;
  invitedAt?: Date;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public readonly createdAt!: Date;
}

export interface OrganizationAttributes {
  id: number;
  name: string;
  type: string;
  description?: string;
  createdAt?: Date;
}

export interface OrganizationCreationAttributes extends Optional<OrganizationAttributes, 'id' | 'createdAt'> {}

export class Organization extends Model<OrganizationAttributes, OrganizationCreationAttributes> implements OrganizationAttributes {
  public readonly createdAt!: Date;
}

export interface StationAttributes {
  id: number;
  name: string;
  organizationId?: number;
  region: string;
  locationLat?: number;
  locationLng?: number;
  district?: string;
  sector?: string;
  address?: string;
  phone?: string;
  createdAt?: Date;
}

export interface StationCreationAttributes extends Optional<StationAttributes, 'id' | 'createdAt'> {}

export class Station extends Model<StationAttributes, StationCreationAttributes> implements StationAttributes {
  public readonly createdAt!: Date;
}

export interface IncidentAttributes {
  id: number;
  title: string;
  description: string;
  reporterId?: number;
  organizationId?: number;
  stationId?: number;
  assignedToId?: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  photoUrl?: string;
  notes?: string;
  upvotes: number;
  escalatedBy?: number;
  escalatedAt?: Date;
  escalationReason?: string;
  escalationLevel: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IncidentCreationAttributes extends Optional<IncidentAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Incident extends Model<IncidentAttributes, IncidentCreationAttributes> implements IncidentAttributes {
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export interface InvitationAttributes {
  id: number;
  email: string;
  token: string;
  role: 'main_admin' | 'super_admin' | 'station_admin' | 'station_staff' | 'citizen';
  organizationId?: number;
  stationId?: number;
  invitedBy: number;
  expiresAt: Date;
  isUsed: boolean;
  createdAt?: Date;
}

export interface InvitationCreationAttributes extends Optional<InvitationAttributes, 'id' | 'createdAt'> {}

export class Invitation extends Model<InvitationAttributes, InvitationCreationAttributes> implements InvitationAttributes {
  public readonly createdAt!: Date;
}

export interface AuditLogAttributes {
  id: number;
  userId?: number;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'invite' | 'assign' | 'register' | 'citizen_report' | 'citizen_upvote' | 'emergency_alert' | 'view_public_incidents';
  entityType: string;
  entityId?: number;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

export interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'createdAt'> {}

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public readonly createdAt!: Date;
}

export interface EmergencyContactAttributes {
  id: number;
  userId: number;
  name: string;
  phone: string;
  relationship: string;
  isPrimary?: boolean;
  createdAt?: Date;
}

export interface EmergencyContactCreationAttributes extends Optional<EmergencyContactAttributes, 'id' | 'createdAt'> {}

export class EmergencyContact extends Model<EmergencyContactAttributes, EmergencyContactCreationAttributes> implements EmergencyContactAttributes {
  public readonly createdAt!: Date;
}

export interface FileUploadAttributes {
  id: number;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  uploadedBy: number;
  entityType?: string;
  entityId?: number;
  fileType: 'image' | 'document' | 'profile_picture' | 'incident_photo';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FileUploadCreationAttributes extends Optional<FileUploadAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class FileUpload extends Model<FileUploadAttributes, FileUploadCreationAttributes> implements FileUploadAttributes {
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export interface NotificationAttributes {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  relatedEntityType?: string;
  relatedEntityId?: number;
  isRead: boolean;
  actionRequired: boolean;
  createdAt?: Date;
}

export interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'createdAt'> {}

export class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public readonly createdAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'last_name',
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen'),
      allowNull: false,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'organization_id',
    },
    stationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'station_id',
    },
    profilePicture: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'profile_picture',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    isInvited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_invited',
    },
    invitedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'invited_by',
    },
    invitedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'invited_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

Organization.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Organization',
    tableName: 'organizations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

Station.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'organization_id',
    },
    region: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    locationLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      field: 'location_lat',
    },
    locationLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      field: 'location_lng',
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    district: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'district',
    },
    sector: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'sector',
    },
  },
  {
    sequelize,
    modelName: 'Station',
    tableName: 'stations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

Incident.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    reporterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'reporter_id',
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'organization_id',
    },
    stationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'station_id',
    },
    assignedToId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'assigned_to_id',
    },
    status: {
      type: DataTypes.ENUM('pending', 'assigned', 'in_progress', 'resolved', 'escalated'),
      defaultValue: 'pending',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
    },
    locationLat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      field: 'location_lat',
    },
    locationLng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      field: 'location_lng',
    },
    locationAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'location_address',
    },
    photoUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'photo_url',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    upvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    escalatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'escalated_by',
    },
    escalatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'escalated_at',
    },
    escalationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'escalation_reason',
    },
    escalationLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'escalation_level',
    },
  },
  {
    sequelize,
    modelName: 'Incident',
    tableName: 'incidents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

Invitation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    role: {
      type: DataTypes.ENUM('main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen'),
      allowNull: false,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'organization_id',
    },
    stationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'station_id',
    },
    invitedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'invited_by',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_used',
    },
  },
  {
    sequelize,
    modelName: 'Invitation',
    tableName: 'invitations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
    },
    action: {
      type: DataTypes.ENUM('create', 'update', 'delete', 'login', 'logout', 'invite', 'assign', 'register', 'citizen_report', 'citizen_upvote', 'emergency_alert', 'view_public_incidents'),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'entity_id',
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'ip_address',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

FileUpload.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_name',
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'original_name',
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'mime_type',
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    path: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'uploaded_by',
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'entity_id',
    },
    fileType: {
      type: DataTypes.ENUM('image', 'document', 'profile_picture', 'incident_photo'),
      allowNull: false,
      field: 'file_type',
    },
  },
  {
    sequelize,
    modelName: 'FileUpload',
    tableName: 'file_uploads',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('info', 'warning', 'success', 'error'),
      allowNull: false,
    },
    relatedEntityType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'related_entity_type',
    },
    relatedEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'related_entity_id',
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_read',
    },
    actionRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'action_required',
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  }
);

User.belongsTo(Organization, { foreignKey: 'organizationId' });
User.belongsTo(Station, { foreignKey: 'stationId' });
Station.belongsTo(Organization, { foreignKey: 'organizationId' });
Incident.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
Incident.belongsTo(Organization, { foreignKey: 'organizationId' });
Incident.belongsTo(Station, { foreignKey: 'stationId' });
Incident.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignee' });
Invitation.belongsTo(User, { foreignKey: 'invitedBy', as: 'inviter' });
Invitation.belongsTo(Organization, { foreignKey: 'organizationId' });
Invitation.belongsTo(Station, { foreignKey: 'stationId' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });
FileUpload.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });
Notification.belongsTo(User, { foreignKey: 'userId' });

Organization.hasMany(User, { foreignKey: 'organizationId' });
Organization.hasMany(Station, { foreignKey: 'organizationId' });
Station.hasMany(User, { foreignKey: 'stationId' });
Station.hasMany(Incident, { foreignKey: 'stationId' });
User.hasMany(Incident, { foreignKey: 'reporterId', as: 'reportedIncidents' });
User.hasMany(Incident, { foreignKey: 'assignedToId', as: 'assignedIncidents' });
User.hasMany(Invitation, { foreignKey: 'invitedBy', as: 'sentInvitations' });
User.hasMany(AuditLog, { foreignKey: 'userId' });
User.hasMany(FileUpload, { foreignKey: 'uploadedBy', as: 'uploads' });
User.hasMany(Notification, { foreignKey: 'userId' });

export type InsertUser = UserCreationAttributes;
export type InsertOrganization = OrganizationCreationAttributes;
export type InsertStation = StationCreationAttributes;
export type InsertIncident = IncidentCreationAttributes;
export type InsertInvitation = InvitationCreationAttributes;
export type InsertAuditLog = AuditLogCreationAttributes;
export type InsertFileUpload = FileUploadCreationAttributes;
export type InsertNotification = NotificationCreationAttributes;