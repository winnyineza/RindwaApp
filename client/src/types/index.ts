export interface User {
  id: string; // UUID
  userId?: string; // Alias for id (for backward compatibility)
  email: string;
  firstName: string;
  lastName: string;
  role: 'main_admin' | 'super_admin' | 'station_admin' | 'station_staff' | 'citizen';
  organisationId?: string; // UUID
  stationId?: string; // UUID
  organizationName?: string;
  stationName?: string;
  phone?: string;
  title?: string;
  department?: string;
  bio?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  isActive: boolean;
  isInvited: boolean;
  invitedBy?: string; // UUID
  invitedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  profilePicture?: string;
}

export interface Organization {
  id: string; // UUID
  name: string;
  type: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Station {
  id: string; // UUID
  name: string;
  organisationId?: string; // UUID
  region: string;
  locationLat?: number;
  locationLng?: number;
  address?: string;
  phone?: string;
  district?: string;
  sector?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string; // UUID
  title: string;
  description: string;
  type: 'fire' | 'medical' | 'police' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'assigned' | 'in_progress' | 'resolved' | 'escalated'; // Aligned with backend - removed 'pending'
  location: {
    lat?: number;
    lng?: number;
    address?: string;
  };
  stationId: string; // UUID
  organisationId?: string; // UUID
  reportedById: string; // UUID
  assignedTo?: string; // UUID (primary field from backend)
  assignedToId?: string; // UUID (alias for backward compatibility)
  assignedBy?: string; // UUID
  assignedAt?: string;
  escalatedBy?: string; // UUID
  escalatedAt?: string;
  escalationReason?: string;
  escalationLevel?: number;
  resolvedBy?: string; // UUID
  resolvedAt?: string;
  resolution?: string;
  reopenedBy?: string; // UUID
  reopenedAt?: string;
  reopenReason?: string;
  statusUpdatedBy?: string; // UUID
  statusUpdatedAt?: string;
  notes?: string; // Additional notes field
  upvotes?: number; // Community upvotes count
  createdAt: string;
  updatedAt: string;
  reported_by?: string;
  // Reporter contact information
  reporter_name?: string;
  reporter_phone?: string;
  reporter_email?: string;
  reporter_emergency_contacts?: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
  // Frontend computed fields
  assignedToName?: string;
  reporterInfo?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    emergencyContacts?: {
      id: string;
      name: string;
      phone: string;
      relationship: string;
      isPrimary: boolean;
    }[];
  };
}

export interface IncidentStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}
