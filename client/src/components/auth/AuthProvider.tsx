import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      // Handle authentication-based navigation
      const publicRoutes = ["/login", "/forgot-password", "/reset-password", "/accept-invitation"];
      const isPublicRoute = publicRoutes.some(route => 
        location === route || 
        location.startsWith("/reset-password/") || 
        location.startsWith("/accept-invitation/")
      );

      console.log("AuthProvider navigation check:", {
        user: !!user,
        loading,
        location,
        isPublicRoute
      });

      if (!user && !isPublicRoute) {
        console.log("AuthProvider: No user, redirecting to login");
        setLocation("/login");
      } else if (user && isPublicRoute && location !== "/dashboard") {
        console.log("AuthProvider: User authenticated, redirecting from public route to dashboard");
        setLocation("/dashboard");
      }
    }
  }, [user, loading, location, setLocation]);

  // Additional effect to ensure immediate redirect when user becomes authenticated
  useEffect(() => {
    if (user && !loading) {
      const publicRoutes = ["/login", "/forgot-password", "/reset-password", "/accept-invitation"];
      const isPublicRoute = publicRoutes.some(route => 
        location === route || 
        location.startsWith("/reset-password/") || 
        location.startsWith("/accept-invitation/")
      );
      
      if (isPublicRoute && location !== "/dashboard") {
        console.log("AuthProvider: User authenticated, backup redirect to dashboard");
        setLocation("/dashboard");
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return <>{children}</>;
};
