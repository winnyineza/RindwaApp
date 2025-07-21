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
  delete: createAuthenticatedRequest("DELETE"),
};

// Specific API functions
export const getIncidents = () => api.get("/api/incidents");
export const getIncidentStats = () => api.get("/api/stats");
export const createIncident = (data: any) => api.post("/api/incidents", data);
export const updateIncident = (id: number, data: any) => api.put(`/api/incidents/${id}`, data);
export const assignIncident = (id: number, data: any) => api.put(`/api/incidents/${id}/assign`, data);
export const escalateIncident = (id: number, data: any) => api.post(`/api/incidents/${id}/escalate`, data);

export const getOrganizations = () => api.get("/api/organizations");
export const createOrganization = (data: any) => api.post("/api/organizations", data);
export const updateOrganization = (id: number, data: any) => api.put(`/api/organizations/${id}`, data);
export const deleteOrganization = (id: number) => api.delete(`/api/organizations/${id}`);

export const getStations = (organizationId?: number) => 
  api.get(`/api/stations${organizationId ? `?organizationId=${organizationId}` : ""}`);
export const createStation = (data: any) => api.post("/api/stations", data);
export const updateStation = (id: number, data: any) => api.put(`/api/stations/${id}`, data);

export const getUsers = (params?: any) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/api/users${query ? `?${query}` : ""}`);
};

export const migrateUser = (userId: number, stationId: number) => 
  api.put(`/api/users/${userId}/migrate`, { stationId });
