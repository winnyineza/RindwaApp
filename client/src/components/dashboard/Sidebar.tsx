import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Building, 
  MapPin, 
  AlertTriangle, 
  Users, 
  Mail, 
  BarChart3, 
  FileText, 
  History
} from "lucide-react";
import { UserProfile } from "./UserProfile";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { 
    icon: LayoutDashboard, 
    label: "Dashboard", 
    path: "/dashboard", 
    roles: ["main_admin", "super_admin", "station_admin", "station_staff"] 
  },
  { 
    icon: Building, 
    label: "Organizations", 
    path: "/organizations", 
    roles: ["main_admin"] 
  },
  { 
    icon: MapPin, 
    label: "Stations", 
    path: "/stations", 
    roles: ["main_admin", "super_admin"] 
  },
  { 
    icon: AlertTriangle, 
    label: "Incidents", 
    path: "/incidents", 
    roles: ["main_admin", "super_admin", "station_admin", "station_staff"] 
  },
  { 
    icon: History, 
    label: "Incident History", 
    path: "/incident-history", 
    roles: ["main_admin", "super_admin", "station_admin", "station_staff"] 
  },
  { 
    icon: Users, 
    label: "Users", 
    path: "/users", 
    roles: ["main_admin", "super_admin", "station_admin"] 
  },
  { 
    icon: Mail, 
    label: "Invitations", 
    path: "/invitations", 
    roles: ["main_admin", "super_admin", "station_admin"] 
  },
  { 
    icon: BarChart3, 
    label: "Analytics", 
    path: "/analytics", 
    roles: ["main_admin", "super_admin", "station_admin"] 
  },
  { 
    icon: FileText, 
    label: "Audit Logs", 
    path: "/audit", 
    roles: ["main_admin"] 
  },
];

export const AppSidebar = () => {
  const [location] = useLocation();
  const { user } = useAuth();

  const filteredNavItems = navItems.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  return (
    <Sidebar variant="sidebar" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 relative group">
            <div className="w-full h-full rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/20 flex items-center justify-center p-1 transition-all duration-300 group-hover:shadow-red-500/30 group-hover:scale-105">
              <img 
                src="/logo.png" 
                alt="Rindwa Logo" 
                className="w-full h-full object-contain rounded-md filter drop-shadow-sm"
              />
            </div>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground">Rindwa</h1>
            <p className="text-xs text-muted-foreground">Emergency System</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>System Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const isActive = location === item.path;
                const Icon = item.icon;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <a href={item.path} className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <UserProfile />
      </SidebarFooter>
    </Sidebar>
  );
};
