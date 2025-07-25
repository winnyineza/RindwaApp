import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export const UserProfile = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      main_admin: { label: "Main Admin", className: "bg-red-500/20 text-red-400 border-red-500/30" },
      super_admin: { label: "Super Admin", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      station_admin: { label: "Station Admin", className: "bg-green-500/20 text-green-400 border-green-500/30" },
      station_staff: { label: "Station Staff", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
      citizen: { label: "Citizen", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" }
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.citizen;

    return (
      <Badge variant="outline" className={`text-xs border ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="bg-sidebar-accent border border-sidebar-border rounded-lg p-3">
      <div className="flex items-center space-x-3 mb-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        </div>
      </div>
      
      <div className="mb-3">
        {getRoleBadge(user.role)}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Settings className="w-4 h-4 mr-1" />
          Profile
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-sidebar-foreground hover:text-red-400 hover:bg-sidebar-accent"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};