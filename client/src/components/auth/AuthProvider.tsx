import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      // Allow access to public pages without authentication
      const publicRoutes = ["/login", "/forgot-password", "/reset-password", "/accept-invitation"];
      const isPublicRoute = publicRoutes.some(route => 
        location === route || 
        location.startsWith("/reset-password/") || 
        location.startsWith("/accept-invitation/")
      );
      
      if (!user && !isPublicRoute) {
        setLocation("/login");
      } else if (user && location === "/login") {
        setLocation("/dashboard");
      }
    }
  }, [user, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return <>{children}</>;
};
