export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'main_admin' | 'super_admin' | 'station_admin' | 'station_staff' | 'citizen';
  organizationId?: number;
  stationId?: number;
  organizationName?: string;
  stationName?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  profilePicture?: string;
}

export interface Organization {
  id: number;
  name: string;
  type: string;
  description?: string;
  createdAt: string;
}

export interface Station {
  id: number;
  name: string;
  organizationId: number;
  region: string;
  locationLat?: string;
  locationLng?: string;
  address?: string;
  phone?: string;
  createdAt: string;
}

export interface Incident {
  id: number;
  title: string;
  description: string;
  reporterId: number;
  organizationId: number;
  stationId: number;
  assignedToId?: number;
  assignedToName?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  locationLat?: string;
  locationLng?: string;
  locationAddress?: string;
  photoUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  reporterInfo?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: string;
    emergencyContacts?: {
      id: number;
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
