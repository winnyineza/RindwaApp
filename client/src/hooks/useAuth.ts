import { useState, useEffect } from "react";
import { User } from "@/types";
import { getStoredToken, removeStoredToken, setStoredToken } from "@/lib/auth";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserFromToken = (token?: string) => {
    const authToken = token || getStoredToken();
    
    if (authToken) {
      try {
        // Decode JWT token to get user info
        const payload = JSON.parse(atob(authToken.split('.')[1]));

        // Check if token is expired
        const currentTime = Date.now() / 1000;
        if (payload.exp && payload.exp < currentTime) {
          removeStoredToken();
          setUser(null);
          setLoading(false);
          return;
        }

        const newUser: User = {
          id: payload.userId,
          email: payload.email,
          firstName: payload.firstName || '',
          lastName: payload.lastName || '',
          role: payload.role,
          organisationId: payload.organisationId,
          stationId: payload.stationId,
          organizationName: payload.organizationName || '',
          stationName: payload.stationName || '',
          phone: payload.phone || '',
          isActive: true,
          isInvited: false,
          createdAt: payload.createdAt || '',
          updatedAt: payload.updatedAt || payload.createdAt || ''
        };
        
        setUser(newUser);
      } catch (error) {
        removeStoredToken();
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUserFromToken();
  }, []);

  const logout = () => {
    // Clear all authentication data
    localStorage.clear();
    
    // Clear state immediately
    setUser(null);
    setLoading(false);
    
    // Force navigation to login
    window.location.href = "/login";
  };

  const login = (token: string, onComplete?: () => void) => {
    // Store the new token first
    setStoredToken(token);
    
    // Force synchronous user loading
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const newUser: User = {
        id: payload.userId,
        email: payload.email,
        firstName: payload.firstName || '',
        lastName: payload.lastName || '',
        role: payload.role,
        organisationId: payload.organisationId,
        stationId: payload.stationId,
        organizationName: payload.organizationName || '',
        stationName: payload.stationName || '',
        phone: payload.phone || '',
        isActive: true,
        isInvited: false,
        createdAt: payload.createdAt || '',
        updatedAt: payload.updatedAt || payload.createdAt || ''
      };
      
      // Update state immediately
      setUser(newUser);
      setLoading(false);
      
      console.log("Login successful, user set:", newUser);
      
      // Call onComplete callback after state update
      if (onComplete) {
        setTimeout(onComplete, 0);
      }
      
    } catch (error) {
      console.error("Error parsing token during login:", error);
      setUser(null);
    }
  };

  return {
    user,
    loading,
    logout,
    login,
    isAuthenticated: !!user,
    hasRole: (roles: string[]) => user ? roles.includes(user.role) : false
  };
};
