import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './db';

export interface UserAttributes {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'main_admin' | 'super_admin' | 'station_admin' | 'station_staff' | 'citizen';
  organisationId?: string;
  stationId?: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public phone?: string;
  public role!: 'main_admin' | 'super_admin' | 'station_admin' | 'station_staff' | 'citizen';
  public organisationId?: string;
  public stationId?: string;
  public title?: string;
  public department?: string;
  public bio?: string;
  public address?: string;
  public city?: string;
  public country?: string;
  public timezone?: string;
  public profilePicture?: string;
  public isActive!: boolean;
  public isInvited!: boolean;
  public invitedBy?: string;
  public invitedAt?: Date;
  public lastLoginAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export interface OrganizationAttributes {
  id: string;
  name: string;
  code?: string;
  type: string;
  userId: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  timezone: string;
  operatingHours?: any;
  settings?: any;
  isActive: boolean;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrganizationCreationAttributes extends Optional<OrganizationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Organization extends Model<OrganizationAttributes, OrganizationCreationAttributes> implements OrganizationAttributes {
  public id!: string;
  public name!: string;
  public code?: string;
  public type!: string;
  public userId!: string;
  public address!: string;
  public city!: string;
  public country!: string;
  public phone!: string;
  public email!: string;
  public website?: string;
  public timezone!: string;
  public operatingHours?: any;
  public settings?: any;
  public isActive!: boolean;
  public description?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export interface StationAttributes {
  id: string;
  name: string;
  code?: string;
  type?: string;
  userId?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  organisationId: string;
  coverageArea?: any;
  equipment?: any;
  shifts?: any;
  settings?: any;
  isActive: boolean;
  district?: string;
  sector?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StationCreationAttributes extends Optional<StationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Station extends Model<StationAttributes, StationCreationAttributes> implements StationAttributes {
  public id!: string;
  public name!: string;
  public code?: string;
  public type?: string;
  public userId?: string;
  public address?: string;
  public city?: string;
  public country?: string;
  public latitude?: number;
  public longitude?: number;
  public phone?: string;
  public email?: string;
  public organisationId!: string;
  public coverageArea?: any;
  public equipment?: any;
  public shifts?: any;
  public settings?: any;
  public isActive!: boolean;
  public district?: string;
  public sector?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export interface IncidentAttributes {
  id: string;
  title: string;
  description: string;
  type: 'fire' | 'medical' | 'police' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'assigned' | 'in_progress' | 'resolved' | 'escalated';
  location: any;
  stationId: string;
  organisationId?: string;
  reportedById: string;
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: Date;
  escalatedBy?: string;
  escalatedAt?: Date;
  escalationReason?: string;
  escalationLevel?: number;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
  reopenedBy?: string;
  reopenedAt?: Date;
  reopenReason?: string;
  statusUpdatedBy?: string;
  statusUpdatedAt?: Date;
  reportedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IncidentCreationAttributes extends Optional<IncidentAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Incident extends Model<IncidentAttributes, IncidentCreationAttributes> implements IncidentAttributes {
  public id!: string;
  public title!: string;
  public description!: string;
  public type!: 'fire' | 'medical' | 'police' | 'other';
  public priority!: 'low' | 'medium' | 'high' | 'critical';
  public status!: 'reported' | 'assigned' | 'in_progress' | 'resolved' | 'escalated';
  public location!: any;
  public stationId!: string;
  public organisationId?: string;
  public reportedById!: string;
  public assignedTo?: string;
  public assignedBy?: string;
  public assignedAt?: Date;
  public escalatedBy?: string;
  public escalatedAt?: Date;
  public escalationReason?: string;
  public escalationLevel?: number;
  public resolvedBy?: string;
  public resolvedAt?: Date;
  public resolution?: string;
  public reopenedBy?: string;
  public reopenedAt?: Date;
  public reopenReason?: string;
  public statusUpdatedBy?: string;
  public statusUpdatedAt?: Date;
  public reportedBy?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export interface InvitationAttributes {
  id: string;
  email: string;
  token: string;
  role: 'main_admin' | 'super_admin' | 'station_admin' | 'station_staff' | 'citizen';
  organizationId?: string;
  stationId?: string;
  invitedBy: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt?: Date;
}

export interface InvitationCreationAttributes extends Optional<InvitationAttributes, 'id' | 'createdAt'> {}

export class Invitation extends Model<InvitationAttributes, InvitationCreationAttributes> implements InvitationAttributes {
  public id!: string;
  public email!: string;
  public token!: string;
  public role!: 'main_admin' | 'super_admin' | 'station_admin' | 'station_staff' | 'citizen';
  public organizationId?: string;
  public stationId?: string;
  public invitedBy!: string;
  public expiresAt!: Date;
  public isUsed!: boolean;
  public readonly createdAt!: Date;
}

export interface AuditLogAttributes {
  id: string;
  action: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: string;
  public action!: string;
  public userId?: string;
  public resourceType?: string;
  public resourceId?: string;
  public details!: any;
  public ipAddress?: string;
  public userAgent?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export interface EmergencyContactAttributes {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary?: boolean;
  createdAt?: Date;
}

export interface EmergencyContactCreationAttributes extends Optional<EmergencyContactAttributes, 'id' | 'createdAt'> {}

export class EmergencyContact extends Model<EmergencyContactAttributes, EmergencyContactCreationAttributes> implements EmergencyContactAttributes {
  public id!: string;
  public userId!: string;
  public name!: string;
  public phone!: string;
  public relationship!: string;
  public isPrimary?: boolean;
  public readonly createdAt!: Date;
}

export interface FileUploadAttributes {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  uploadedBy: string;
  entityType?: string;
  entityId?: string;
  fileType: 'image' | 'document' | 'profile_picture' | 'incident_photo';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FileUploadCreationAttributes extends Optional<FileUploadAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class FileUpload extends Model<FileUploadAttributes, FileUploadCreationAttributes> implements FileUploadAttributes {
  public id!: string;
  public fileName!: string;
  public originalName!: string;
  public mimeType!: string;
  public size!: number;
  public path!: string;
  public url!: string;
  public uploadedBy!: string;
  public entityType?: string;
  public entityId?: string;
  public fileType!: 'image' | 'document' | 'profile_picture' | 'incident_photo';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export interface NotificationAttributes {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  actionRequired: boolean;
  createdAt?: Date;
}

export interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'createdAt'> {}

export class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: string;
  public userId!: string;
  public title!: string;
  public message!: string;
  public type!: 'info' | 'warning' | 'success' | 'error';
  public relatedEntityType?: string;
  public relatedEntityId?: string;
  public isRead!: boolean;
  public actionRequired!: boolean;
  public readonly createdAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM('main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen'),
      allowNull: false,
    },
    organisationId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    stationId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profilePicture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isInvited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    invitedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

Organization.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    operatingHours: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

Station.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    organisationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'organisation_id',
    },
    coverageArea: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    equipment: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    shifts: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

Incident.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
    type: {
      type: DataTypes.ENUM('fire', 'medical', 'police', 'other'),
      allowNull: false,
      defaultValue: 'other',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('reported', 'assigned', 'in_progress', 'resolved', 'escalated'),
      defaultValue: 'reported',
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    stationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'station_id',
    },
    organisationId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'organisation_id',
    },
    reportedById: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'reported_by_id',
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_to',
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assigned_by',
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'assigned_at',
    },
    escalatedBy: {
      type: DataTypes.UUID,
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
      allowNull: true,
      field: 'escalation_level',
    },
    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'resolved_by',
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at',
    },
    resolution: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'resolution',
    },
    reopenedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'reopened_by',
    },
    reopenedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reopened_at',
    },
    reopenReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'reopen_reason',
    },
    statusUpdatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'status_updated_by',
    },
    statusUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'status_updated_at',
    },
    reportedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'reported_by',
    },
  },
  {
    sequelize,
    modelName: 'Incident',
    tableName: 'incidents',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

Invitation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
      type: DataTypes.UUID,
      allowNull: true,
      field: 'organization_id',
    },
    stationId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'station_id',
    },
    invitedBy: {
      type: DataTypes.UUID,
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
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
    },
    resourceType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'resource_type',
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'resource_id',
    },
    details: {
      type: DataTypes.JSONB,
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
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

FileUpload.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
      type: DataTypes.UUID,
      allowNull: false,
      field: 'uploaded_by',
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.UUID,
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
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
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
      type: DataTypes.UUID,
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
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }
);

User.belongsTo(Organization, { foreignKey: 'organisationId' });
User.belongsTo(Station, { foreignKey: 'stationId' });
Organization.belongsTo(User, { foreignKey: 'userId' });
Station.belongsTo(Organization, { foreignKey: 'organisationId' });
Incident.belongsTo(User, { foreignKey: 'reportedById', as: 'reporter' });
Incident.belongsTo(Organization, { foreignKey: 'organisationId' });
Incident.belongsTo(Station, { foreignKey: 'stationId' });
Incident.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
Invitation.belongsTo(User, { foreignKey: 'invitedBy', as: 'inviter' });
Invitation.belongsTo(Organization, { foreignKey: 'organizationId' });
Invitation.belongsTo(Station, { foreignKey: 'stationId' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });
FileUpload.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });
Notification.belongsTo(User, { foreignKey: 'userId' });

Organization.hasMany(User, { foreignKey: 'organisationId' });
Organization.hasMany(Station, { foreignKey: 'organisationId' });
Station.hasMany(User, { foreignKey: 'stationId' });
Station.hasMany(Incident, { foreignKey: 'stationId' });
User.hasMany(Incident, { foreignKey: 'reportedById', as: 'reportedIncidents' });
User.hasMany(Incident, { foreignKey: 'assignedTo', as: 'assignedIncidents' });
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
export type InsertEmergencyContact = EmergencyContactCreationAttributes;