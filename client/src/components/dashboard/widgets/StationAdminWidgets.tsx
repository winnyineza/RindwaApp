import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Users, 
  Clock,
  CheckCircle,
  UserPlus,
  Calendar,
  MapPin,
  Activity,
  TrendingUp,
  Shield,
  Loader2
} from 'lucide-react';
import { getIncidentStats, getUsers } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';

export const StationAdminWidgets = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getIncidentStats,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getUsers,
    refetchInterval: 60000,
  });

  // Show loading state
  if (statsLoading || usersLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show errors if any
  if (statsError || usersError) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Dashboard Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {statsError && <p className="text-red-600">• Failed to load incident statistics</p>}
              {usersError && <p className="text-red-600">• Failed to load users</p>}
              <p className="text-gray-600 mt-4">Please refresh the page or contact support if the issue persists.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate real data metrics
  const stationUsers = users?.filter((u: any) => u.stationId === user?.stationId) || [];
  const stationStaff = stationUsers.filter((u: any) => u.role === 'station_staff');
  const activeStaff = stationUsers.filter((u: any) => u.isActive !== false);
  
  const resolutionRate = stats?.total ? Math.round((stats.resolved / stats.total) * 100) : 0;
  const pendingRate = stats?.total ? Math.round((stats.pending / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Station Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Station Overview
            <Badge variant="outline" className="ml-auto">Live</Badge>
          </CardTitle>
          <CardDescription>
            Your station's current status and metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Staff</span>
              <span className="font-bold text-blue-600">{stationUsers.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Staff</span>
              <span className="font-bold text-green-600">{activeStaff.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Station Staff</span>
              <span className="font-bold">{stationStaff.length}</span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Staff Utilization</span>
                <span>{stationUsers.length > 0 ? Math.round((activeStaff.length / stationUsers.length) * 100) : 0}%</span>
              </div>
              <Progress value={stationUsers.length > 0 ? (activeStaff.length / stationUsers.length) * 100 : 0} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incident Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Incident Management
            <Badge variant="outline" className="ml-auto text-xs">Real-time</Badge>
          </CardTitle>
          <CardDescription>
            Current incident status and metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Cases</span>
              <span className="font-bold">{stats?.total || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending
              </span>
              <Badge variant={stats?.pending > 0 ? "destructive" : "secondary"}>
                {stats?.pending || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-1">
                <Activity className="h-3 w-3" />
                In Progress
              </span>
              <Badge variant={stats?.inProgress > 0 ? "default" : "secondary"}>
                {stats?.inProgress || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Resolved
              </span>
              <Badge variant="secondary">{stats?.resolved || 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Management
          </CardTitle>
          <CardDescription>
            Manage your station's personnel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stationUsers.length > 0 ? (
              stationUsers.slice(0, 3).map((staff: any) => (
                <div key={staff.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{staff.firstName} {staff.lastName}</p>
                    <p className="text-xs text-gray-500 capitalize">{staff.role.replace('_', ' ')}</p>
                  </div>
                  <Badge variant={staff.isActive !== false ? "secondary" : "outline"}>
                    {staff.isActive !== false ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No staff members found</p>
                <p className="text-xs">Invite staff to get started</p>
              </div>
            )}
            <div className="pt-2 flex gap-2">
              <Link href="/users">
                <Button size="sm" variant="outline" className="flex-1">
                  <Users className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </Link>
              <Link href="/invitations">
                <Button size="sm" className="flex-1">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <CardDescription>
            Key performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Resolution Rate</span>
                <span>{resolutionRate}%</span>
              </div>
              <Progress value={resolutionRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Pending Cases</span>
                <span>{pendingRate}%</span>
              </div>
              <Progress value={pendingRate} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-lg font-bold text-green-600">{stats?.resolved || 0}</div>
                <p className="text-xs text-gray-600">Resolved</p>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded">
                <div className="text-lg font-bold text-yellow-600">{stats?.pending || 0}</div>
                <p className="text-xs text-gray-600">Pending</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Station Activity
            <Badge variant="outline" className="ml-auto text-xs">Live</Badge>
          </CardTitle>
          <CardDescription>
            Monitor your station's real-time activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-blue-600">{stats?.total || 0}</div>
              <p className="text-sm text-gray-600">Total Cases</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-yellow-600">{stats?.pending || 0}</div>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-green-600">{stats?.resolved || 0}</div>
              <p className="text-sm text-gray-600">Resolved</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-purple-600">{activeStaff.length}</div>
              <p className="text-sm text-gray-600">Active Staff</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common station management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Link href="/incidents">
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Manage Incidents
              </Button>
            </Link>
            <Link href="/users">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Manage Staff
              </Button>
            </Link>
            <Link href="/invitations">
              <Button variant="outline" className="w-full justify-start">
                <UserPlus className="h-4 w-4 mr-2" />
                Send Invitations
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};