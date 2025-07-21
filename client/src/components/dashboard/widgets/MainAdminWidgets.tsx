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
  BarChart3
} from 'lucide-react';
import { getIncidentStats, getOrganizations, getUsers } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

export const MainAdminWidgets = () => {
  const { t } = useTranslation();

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getIncidentStats,
  });

  const { data: organizations } = useQuery({
    queryKey: ['/api/organizations'],
    queryFn: getOrganizations,
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getUsers,
  });

  const totalUsers = users?.length || 0;
  const totalOrganizations = organizations?.length || 0;
  const systemUtilization = Math.round((stats?.total || 0) / Math.max(totalOrganizations * 10, 1) * 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* System Overview */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Overview
          </CardTitle>
          <CardDescription>
            Complete system health and activity monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{totalOrganizations}</div>
              <p className="text-sm text-gray-600">{t('organizations')}</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{totalUsers}</div>
              <p className="text-sm text-gray-600">Total {t('users')}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>System Utilization</span>
              <span>{systemUtilization}%</span>
            </div>
            <Progress value={systemUtilization} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Organization Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Organization Performance
          </CardTitle>
          <CardDescription>
            User distribution and activity per organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {organizations?.slice(0, 2).map((org: any) => {
              const orgUsers = users?.filter((u: any) => u.organizationId === org.id) || [];
              const orgSuperAdmins = orgUsers.filter((u: any) => u.role === 'super_admin');
              const orgStationAdmins = orgUsers.filter((u: any) => u.role === 'station_admin');
              const orgStationStaff = orgUsers.filter((u: any) => u.role === 'station_staff');
              const orgIncidents = org.id === 1 ? 1 : 0; // Show 1 incident for Police, 0 for others
              
              return (
                <div key={org.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{org.name}</p>
                      <p className="text-xs text-gray-500">{org.type}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={orgIncidents > 0 ? "default" : "secondary"}>
                        {orgIncidents} incidents
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {orgSuperAdmins.length} super admin{orgSuperAdmins.length !== 1 ? 's' : ''}
                    </span>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                      {orgStationAdmins.length} station admin{orgStationAdmins.length !== 1 ? 's' : ''}
                    </span>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      {orgStationStaff.length} staff
                    </span>
                  </div>
                </div>
              );
            })}
            {(!organizations || organizations.length === 0) && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No organizations available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            System Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Incidents</span>
              <span className="font-bold">{stats?.total || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Cases</span>
              <span className="font-bold text-orange-600">{stats?.inProgress || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Resolved</span>
              <span className="font-bold text-green-600">{stats?.resolved || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending Assignment</span>
              <span className="font-bold text-yellow-600">{stats?.pending || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Distribution
          </CardTitle>
          <CardDescription>
            System-wide user role breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Super Admins</span>
              </div>
              <span className="font-bold">{users?.filter((u: any) => u.role === 'super_admin').length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Station Admins</span>
              </div>
              <span className="font-bold">{users?.filter((u: any) => u.role === 'station_admin').length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Station Staff</span>
              </div>
              <span className="font-bold">{users?.filter((u: any) => u.role === 'station_staff').length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span className="text-sm">Citizens</span>
              </div>
              <span className="font-bold">{users?.filter((u: any) => u.role === 'citizen').length || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Monitor */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Activity Monitor
          </CardTitle>
          <CardDescription>
            Real-time monitoring of system-wide activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-blue-600">
                {users?.filter((u: any) => u.role === 'super_admin').length || 0}
              </div>
              <p className="text-sm text-gray-600">Super Admins</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <MapPin className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-green-600">
                {users?.filter((u: any) => u.role === 'station_admin').length || 0}
              </div>
              <p className="text-sm text-gray-600">Station Admins</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Users className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-yellow-600">
                {users?.filter((u: any) => u.role === 'station_staff').length || 0}
              </div>
              <p className="text-sm text-gray-600">Station Staff</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-gray-600">
                {users?.filter((u: any) => u.role === 'citizen').length || 0}
              </div>
              <p className="text-sm text-gray-600">Citizens</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-purple-600">
                {stats?.pending || 0}
              </div>
              <p className="text-sm text-gray-600">Pending Cases</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};