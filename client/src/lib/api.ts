import { apiRequest } from "./queryClient";
import { getStoredToken } from "./auth";

const createAuthenticatedRequest = (method: string) => {
  return async (url: string, data?: any) => {
    const token = getStoredToken();
    if (!token) {
      throw new Error("No authentication token found");
    }

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${token}`,
    };

    if (data) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || response.statusText);
    }

    return response.json();
  };
};

export const api = {
  get: createAuthenticatedRequest("GET"),
  post: createAuthenticatedRequest("POST"),
  put: createAuthenticatedRequest("PUT"),
  patch: createAuthenticatedRequest("PATCH"),
  delete: createAuthenticatedRequest("DELETE"),
};

// Specific API functions
export const getIncidents = () => api.get("/api/incidents");
export const getIncidentStats = () => api.get("/api/stats");
export const createIncident = (data: any) => api.post("/api/incidents", data);
export const updateIncident = (id: string, data: any) => api.put(`/api/incidents/${id}`, data);
export const assignIncident = (id: string, data: any) => api.put(`/api/incidents/${id}/assign`, data);
export const escalateIncident = (id: string, data: any) => api.post(`/api/incidents/${id}/escalate`, data);

export const getOrganizations = () => api.get("/api/organizations");
export const createOrganization = (data: any) => api.post("/api/organizations", data);
export const updateOrganization = (id: string, data: any) => api.put(`/api/organizations/${id}`, data);
export const deleteOrganization = (id: string) => api.delete(`/api/organizations/${id}`);

export const getStations = (organisationId?: string) => 
  api.get(`/api/stations${organisationId ? `?organisationId=${organisationId}` : ""}`);
export const createStation = (data: any) => api.post("/api/stations", data);
export const updateStation = (id: string, data: any) => api.put(`/api/stations/${id}`, data);

export const getUsers = (params?: any) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/api/users${query ? `?${query}` : ""}`);
};

export const createUser = (data: any) => api.post("/api/users", data);

export const toggleUserActive = (userId: string) => 
  api.patch(`/api/users/${userId}/toggle-active`);

export const hardDeleteUser = (userId: string) => 
  api.delete(`/api/users/${userId}/hard-delete`);

export const migrateUser = (userId: string, stationId: string) => 
  api.put(`/api/users/${userId}/migrate`, { stationId });

// Activities
export const getRecentActivities = (limit?: number) => 
  api.get(`/api/activities/recent${limit ? `?limit=${limit}` : ""}`);

// Station Staff
export const getStationStaff = (stationId: string) => 
  api.get(`/api/stations/${stationId}/staff`);
