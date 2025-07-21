import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { 
  Shield, 
  LayoutDashboard, 
  Building, 
  Users, 
  MapPin, 
  AlertTriangle, 
  UserCog, 
  BarChart3, 
  ClipboardList, 
  UsersRound, 
  PieChart, 
  ListTodo, 
  History,
  Mail,
  UserPlus
} from "lucide-react";

const getNavigationConfig = (t: any) => ({
  main_admin: [
    { name: t('dashboard'), href: "/dashboard", icon: LayoutDashboard },
    { name: t('organizations'), href: "/organizations", icon: Building },
    { name: t('stations'), href: "/stations", icon: MapPin },
    { name: t('incidents'), href: "/incidents", icon: AlertTriangle },
    { name: t('users'), href: "/users", icon: Users },
    { name: t('invitations'), href: "/invitations", icon: UserPlus },
    { name: t('analytics'), href: "/analytics", icon: BarChart3 },
    { name: t('auditLogs'), href: "/audit", icon: ClipboardList },
  ],
  super_admin: [
    { name: t('dashboard'), href: "/dashboard", icon: LayoutDashboard },
    { name: t('stations'), href: "/stations", icon: MapPin },
    { name: t('incidents'), href: "/incidents", icon: AlertTriangle },
    { name: t('users'), href: "/users", icon: UserCog },
    { name: t('invitations'), href: "/invitations", icon: Mail },
    { name: t('analytics'), href: "/analytics", icon: BarChart3 },
  ],
  station_admin: [
    { name: t('dashboard'), href: "/dashboard", icon: LayoutDashboard },
    { name: t('incidents'), href: "/incidents", icon: AlertTriangle },
    { name: t('users'), href: "/users", icon: UsersRound },
    { name: t('invitations'), href: "/invitations", icon: Mail },
    { name: t('reports'), href: "/reports", icon: PieChart },
  ],
  station_staff: [
    { name: t('dashboard'), href: "/dashboard", icon: LayoutDashboard },
    { name: t('incidents'), href: "/incidents", icon: ListTodo },
    { name: t('incidentHistory'), href: "/incident-history", icon: History },
  ],
  citizen: [] as any[]
});

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { t } = useTranslation();

  if (!user) return null;

  const navigation = getNavigationConfig(t)[user.role] || [];

  return (
    <div className="w-64 bg-card shadow-lg fixed h-full z-10 border-r border-border">
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Rindwa</h1>
            <p className="text-sm text-muted-foreground">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 space-y-2">
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {user.role === 'main_admin' && 'System Management'}
            {user.role === 'super_admin' && 'Organization Management'}
            {user.role === 'station_admin' && 'Station Management'}
            {user.role === 'station_staff' && 'My Work'}
          </h3>
        </div>
        
        {navigation.map((item: any) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "nav-link flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-border bg-card">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {user.organizationName || user.role.replace('_', ' ')}
            </p>
          </div>
          <Link
            href="/profile"
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <UserCog className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
