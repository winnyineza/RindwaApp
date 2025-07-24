-- Rindwa Emergency Platform Database Schema
-- This script initializes the complete database schema with all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    type VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Kigali',
    operating_hours JSONB,
    settings JSONB,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create stations table
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    type VARCHAR(100),
    user_id UUID,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20),
    email VARCHAR(255),
    organisation_id UUID NOT NULL,
    coverage_area JSONB,
    equipment JSONB,
    shifts JSONB,
    settings JSONB,
    is_active BOOLEAN DEFAULT true,
    district VARCHAR(100),
    sector VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organisation_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL CHECK (role IN ('main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen')),
    "organisationId" UUID,
    "stationId" UUID,
    title VARCHAR(100),
    department VARCHAR(100),
    bio TEXT,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'Africa/Kigali',
    "profilePicture" VARCHAR(500),
    "isActive" BOOLEAN DEFAULT true,
    "isInvited" BOOLEAN DEFAULT false,
    "invitedBy" UUID,
    "invitedAt" TIMESTAMP WITH TIME ZONE,
    "lastLoginAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("organisationId") REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY ("stationId") REFERENCES stations(id) ON DELETE SET NULL,
    FOREIGN KEY ("invitedBy") REFERENCES users(id) ON DELETE SET NULL
);

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('fire', 'medical', 'police', 'other')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status VARCHAR(20) NOT NULL CHECK (status IN ('reported', 'assigned', 'in_progress', 'resolved', 'escalated')) DEFAULT 'reported',
    location JSONB,
    "stationId" UUID NOT NULL,
    "organisationId" UUID,
    "reportedById" UUID NOT NULL,
    "assignedTo" UUID,
    "assignedBy" UUID,
    "assignedAt" TIMESTAMP WITH TIME ZONE,
    "escalatedBy" UUID,
    "escalatedAt" TIMESTAMP WITH TIME ZONE,
    "escalationReason" TEXT,
    "escalationLevel" INTEGER DEFAULT 0,
    "resolvedBy" UUID,
    "resolvedAt" TIMESTAMP WITH TIME ZONE,
    resolution TEXT,
    "reopenedBy" UUID,
    "reopenedAt" TIMESTAMP WITH TIME ZONE,
    "reopenReason" TEXT,
    "statusUpdatedBy" UUID,
    "statusUpdatedAt" TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    upvotes INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("stationId") REFERENCES stations(id) ON DELETE RESTRICT,
    FOREIGN KEY ("organisationId") REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY ("reportedById") REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY ("assignedTo") REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY ("assignedBy") REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY ("escalatedBy") REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY ("resolvedBy") REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY ("reopenedBy") REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY ("statusUpdatedBy") REFERENCES users(id) ON DELETE SET NULL
);

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('main_admin', 'super_admin', 'station_admin', 'station_staff', 'citizen')),
    organization_id UUID,
    station_id UUID,
    invited_by UUID NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID,
    action VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100),
    "entityId" UUID,
    details JSONB,
    "ipAddress" INET,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL
);

-- Create file_uploads table
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_by UUID NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('image', 'document', 'profile_picture', 'incident_photo')),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    "isRead" BOOLEAN DEFAULT false,
    "readAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    "isPrimary" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_organisation ON users("organisationId");
CREATE INDEX IF NOT EXISTS idx_users_station ON users("stationId");

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_station ON incidents("stationId");
CREATE INDEX IF NOT EXISTS idx_incidents_assigned ON incidents("assignedTo");
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents("createdAt");

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs("userId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs("createdAt");
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications("createdAt");

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);

-- Create password_reset_tokens table for secure password resets
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "isUsed" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for password reset tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens("userId");
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens("expiresAt");
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_used ON password_reset_tokens("isUsed");

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON file_uploads FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_emergency_contacts_updated_at BEFORE UPDATE ON emergency_contacts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default main admin user (password: admin123)
-- Note: Change this password immediately in production
INSERT INTO users (
    id, email, password, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt"
) VALUES (
    uuid_generate_v4(),
    'admin@rindwa.com',
    '$2b$10$rQc8Z1N9X.bqV4rj4hL1V.VD8Qa3qJ5qZ1N9X.bqV4rj4hL1V.VD8Q', -- Password: admin123
    'System',
    'Administrator',
    'main_admin',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Create sample organization for testing
INSERT INTO organizations (
    id, name, type, user_id, address, city, country, phone, email, timezone, description
) VALUES (
    uuid_generate_v4(),
    'Rwanda National Police',
    'Law Enforcement',
    (SELECT id FROM users WHERE email = 'admin@rindwa.com' LIMIT 1),
    'KG 9 Ave, Kigali',
    'Kigali',
    'Rwanda',
    '+250788123456',
    'info@police.gov.rw',
    'Africa/Kigali',
    'National law enforcement agency of Rwanda'
) ON CONFLICT DO NOTHING; 