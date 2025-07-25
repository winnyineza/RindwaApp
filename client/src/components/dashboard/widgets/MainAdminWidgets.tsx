import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building, 
  Users, 
  MapPin, 
  AlertTriangle, 
  TrendingUp, 
  Shield,
  Activity,
  BarChart3,
  Loader2
} from 'lucide-react';
import { getIncidentStats, getOrganizations, getUsers } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

export const MainAdminWidgets = () => {
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getIncidentStats,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
  });

  const { data: organizations, isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ['/api/organizations'],
    queryFn: getOrganizations,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getUsers,
    refetchInterval: 60000, // Refresh every minute
  });

  // Show loading state
  if (statsLoading || orgsLoading || usersLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show errors if any
  if (statsError || orgsError || usersError) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Dashboard Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {statsError && <p className="text-destructive">• Failed to load incident statistics</p>}
              {orgsError && <p className="text-destructive">• Failed to load organizations</p>}
              {usersError && <p className="text-destructive">• Failed to load users</p>}
              <p className="text-muted-foreground mt-4">Please refresh the page or contact support if the issue persists.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate real metrics from API data
  const totalUsers = users?.length || 0;
  const totalOrganizations = organizations?.length || 0;
  const systemUtilization = Math.min(Math.round(((stats?.total || 0) / Math.max(totalOrganizations * 5, 1)) * 100), 100);
  
  // Calculate user distribution
  const usersByRole = users?.reduce((acc: any, user: any) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* System Overview */}
      <Card className="col-span-1 md:col-span-2 bg-card border hover:bg-accent/50 transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5 text-primary" />
            System Overview
            <Badge variant="outline" className="ml-auto">Live Data</Badge>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Complete system health and activity monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
              <div className="text-3xl font-bold text-blue-400">{totalOrganizations}</div>
              <p className="text-sm text-muted-foreground">{t('organizations')}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 transition-colors">
              <div className="text-3xl font-bold text-green-400">{totalUsers}</div>
              <p className="text-sm text-muted-foreground">Total {t('users')}</p>
            </div>
          </div>
          <div className="mt-6 p-4 rounded-lg bg-muted">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground font-medium">System Utilization</span>
              <span className="text-foreground font-bold">{systemUtilization}%</span>
            </div>
            <Progress value={systemUtilization} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* System Analytics */}
      <Card className="bg-card border hover:bg-accent/50 transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />
            System Analytics
            <Badge variant="outline" className="ml-auto text-xs">Real-time</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-accent transition-colors">
              <span className="text-sm font-medium text-foreground">Total Incidents</span>
              <span className="font-bold text-lg text-foreground">{stats?.total || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-500/20 border border-orange-500/30 hover:bg-orange-500/30 transition-colors">
              <span className="text-sm font-medium text-foreground">Active Cases</span>
              <span className="font-bold text-lg text-orange-400">{stats?.inProgress || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 transition-colors">
              <span className="text-sm font-medium text-foreground">Resolved</span>
              <span className="font-bold text-lg text-green-400">{stats?.resolved || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors">
              <span className="text-sm font-medium text-foreground">Pending Assignment</span>
              <span className="font-bold text-lg text-yellow-400">{stats?.pending || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization Performance */}
      <Card className="bg-card border hover:bg-accent/50 transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Building className="h-5 w-5 text-primary" />
            Organization Performance
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            User distribution and activity per organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {organizations?.map((org: any) => {
              const orgUsers = users?.filter((u: any) => u.organisationId === org.id) || [];
              const orgSuperAdmins = orgUsers.filter((u: any) => u.role === 'super_admin');
              const orgStationAdmins = orgUsers.filter((u: any) => u.role === 'station_admin');
              const orgStationStaff = orgUsers.filter((u: any) => u.role === 'station_staff');
              
              return (
                <div key={org.id} className="p-4 rounded-lg bg-muted border hover:bg-accent transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">{org.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {orgUsers.length} {orgUsers.length === 1 ? 'user' : 'users'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Super Admins: {orgSuperAdmins.length}</span>
                      <span>Station Admins: {orgStationAdmins.length}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Staff: {orgStationStaff.length}</span>
                      <span>Citizens: {orgUsers.filter((u: any) => u.role === 'citizen').length}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* User Distribution */}
      <Card className="bg-card border hover:bg-accent/50 transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5 text-primary" />
            User Distribution
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            System-wide user role breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-foreground">Super Admins</span>
              </div>
              <span className="font-bold text-blue-400">{usersByRole.super_admin || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/20 border border-green-500/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-foreground">Station Admins</span>
              </div>
              <span className="font-bold text-green-400">{usersByRole.station_admin || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-medium text-foreground">Station Staff</span>
              </div>
              <span className="font-bold text-yellow-400">{usersByRole.station_staff || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-500/20 border border-gray-500/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-sm font-medium text-foreground">Citizens</span>
              </div>
              <span className="font-bold text-gray-400">{usersByRole.citizen || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Activity Monitor */}
      <Card className="col-span-1 md:col-span-2 bg-card border hover:bg-accent/50 transition-all duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-primary" />
            System Activity Monitor
            <Badge variant="outline" className="ml-auto text-xs">Live</Badge>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Real-time monitoring of system-wide activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors">
              <Shield className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <div className="text-lg font-bold text-blue-400">
                {usersByRole.super_admin || 0}
              </div>
              <p className="text-sm text-muted-foreground">Super Admins</p>
            </div>
            <div className="text-center p-4 bg-green-500/20 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors">
              <MapPin className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <div className="text-lg font-bold text-green-400">
                {usersByRole.station_admin || 0}
              </div>
              <p className="text-sm text-muted-foreground">Station Admins</p>
            </div>
            <div className="text-center p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 transition-colors">
              <Users className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-lg font-bold text-yellow-400">
                {usersByRole.station_staff || 0}
              </div>
              <p className="text-sm text-muted-foreground">Station Staff</p>
            </div>
            <div className="text-center p-4 bg-gray-500/20 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition-colors">
              <Users className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <div className="text-lg font-bold text-gray-400">
                {usersByRole.citizen || 0}
              </div>
              <p className="text-sm text-muted-foreground">Citizens</p>
            </div>
            <div className="text-center p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors">
              <AlertTriangle className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <div className="text-lg font-bold text-purple-400">
                {(stats?.pending || 0) + (stats?.inProgress || 0)}
              </div>
              <p className="text-sm text-muted-foreground">Pending Cases</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};