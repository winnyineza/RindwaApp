import { env } from "./env";

export const config = {
  // API Base URL - will be different for development vs production
  apiBaseUrl: env.API_BASE_URL,
  
  // WebSocket URL for real-time features
  wsUrl: env.WS_URL,
  
  // App configuration
  appName: env.APP_NAME,
  version: env.APP_VERSION,
  
  // Feature flags
  features: {
    realTimeNotifications: true,
    offlineSupport: false,
    pushNotifications: true,
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = config.apiBaseUrl.replace(/\/$/, ''); // Remove trailing slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Helper function to get WebSocket URL
export const getWsUrl = (endpoint: string): string => {
  const baseUrl = config.wsUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}; 