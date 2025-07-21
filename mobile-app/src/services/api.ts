import { Alert } from 'react-native';

const API_BASE_URL = 'http://192.168.1.149:3000/api'; // Local backend server

export interface Incident {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved';
  location_address: string;
  location_lat: string;
  location_lng: string;
  photo_url: string | null;
  upvotes: number;
  created_at: string;
  organization_name: string;
  station_name: string | null;
}

export interface IncidentReport {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  location_address: string;
  location_lat?: number;
  location_lng?: number;
  photo?: {
    uri: string;
    type: string;
    name: string;
  };
}

export interface EmergencyAlert {
  emergencyType: 'police' | 'fire' | 'medical';
  location: string;
  message: string;
  contactPhone: string;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Fetch public incidents for citizen view
   * This will be logged as "view_public_incidents" in audit logs
   */
  async fetchPublicIncidents(): Promise<Incident[]> {
    try {
      const response = await fetch(`${this.baseURL}/incidents/public`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const incidents = await response.json();
      
      return incidents;
    } catch (error) {
      console.error('Error fetching public incidents:', error);
      throw error;
    }
  }

  /**
   * Submit citizen incident report
   * This will be logged as "citizen_report" in audit logs
   */
  async submitIncidentReport(report: IncidentReport): Promise<Incident> {
    try {
      const formData = new FormData();
      formData.append('title', report.title);
      formData.append('description', report.description);
      formData.append('priority', report.priority);
      formData.append('location_address', report.location_address);
      
      if (report.location_lat && report.location_lng) {
        formData.append('location_lat', report.location_lat.toString());
        formData.append('location_lng', report.location_lng.toString());
      }

      if (report.photo) {
        formData.append('photo', report.photo as any);
      }

      const response = await fetch(`${this.baseURL}/incidents/citizen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit incident report');
      }

      const incident = await response.json();
      
      return incident;
    } catch (error) {
      console.error('Error submitting incident report:', error);
      throw error;
    }
  }

  /**
   * Upvote an incident
   * This will be logged as "citizen_upvote" in audit logs
   */
  async upvoteIncident(incidentId: number): Promise<Incident> {
    try {
      const response = await fetch(`${this.baseURL}/incidents/${incidentId}/upvote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upvote incident');
      }

      const incident = await response.json();
      
      return incident;
    } catch (error) {
      console.error('Error upvoting incident:', error);
      throw error;
    }
  }

  /**
   * Send emergency alert
   * This will be logged as "emergency_alert" in audit logs
   */
  async sendEmergencyAlert(alert: EmergencyAlert): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/emergency/alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        throw new Error('Failed to send emergency alert');
      }

      
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      throw error;
    }
  }

  /**
   * User authentication (for future use)
   */
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  /**
   * User registration
   * This will be logged as "register" in audit logs
   */
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }): Promise<{ token: string; user: any }> {
    try {
      const response = await fetch(`${this.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('Error during registration:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();

// Utility function to handle API errors consistently
export const handleApiError = (error: any) => {
  const message = error.message || 'An unexpected error occurred';
  Alert.alert('Error', message);
  console.error('API Error:', error);
};