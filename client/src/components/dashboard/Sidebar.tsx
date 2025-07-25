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
  Shield 
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
    roles: ["main_admin", "super_admin", "station_admin"] 
  },
  { 
    icon: AlertTriangle, 
    label: "Incidents", 
    path: "/incidents", 
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
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
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
