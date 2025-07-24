import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Users, 
  AlertTriangle, 
  Clock,
  CheckCircle,
  UserPlus,
  Building,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { getIncidentStats, getStations, getUsers } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';

export const SuperAdminWidgets = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getIncidentStats,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: stations, isLoading: stationsLoading, error: stationsError } = useQuery({
    queryKey: ['/api/stations'],
    queryFn: () => getStations(user?.organisationId),
    enabled: !!user?.organisationId,
    refetchInterval: 60000,
  });

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getUsers,
    refetchInterval: 60000,
  });

  // Show loading state
  if (statsLoading || stationsLoading || usersLoading) {
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
  if (statsError || stationsError || usersError) {
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
              {stationsError && <p className="text-red-600">• Failed to load stations</p>}
              {usersError && <p className="text-red-600">• Failed to load users</p>}
              <p className="text-gray-600 mt-4">Please refresh the page or contact support if the issue persists.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate real data metrics
  const organizationUsers = users?.filter((u: any) => u.organisationId === user?.organisationId) || [];
  const stationAdmins = organizationUsers.filter((u: any) => u.role === 'station_admin');
  const stationStaff = organizationUsers.filter((u: any) => u.role === 'station_staff');
  const totalStations = stations?.length || 0;
  const activeStations = stations?.filter((s: any) => s.isActive !== false).length || totalStations;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Organization Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Organization Overview
            <Badge variant="outline" className="ml-auto">Live</Badge>
          </CardTitle>
          <CardDescription>
            Your organization's current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Stations</span>
              <span className="font-bold text-blue-600">{totalStations}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Stations</span> 
              <span className="font-bold text-green-600">{activeStations}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Staff</span>
              <span className="font-bold">{organizationUsers.length}</span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Station Coverage</span>
                <span>{totalStations > 0 ? Math.round((activeStations / totalStations) * 100) : 0}%</span>
              </div>
              <Progress value={totalStations > 0 ? (activeStations / totalStations) * 100 : 0} className="h-2" />
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
            Manage your organization's staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Station Admins</span>
              <Badge variant="secondary">{stationAdmins.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Station Staff</span>
              <Badge variant="secondary">{stationStaff.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Members</span>
              <Badge variant="outline">{organizationUsers.length}</Badge>
            </div>
            <div className="pt-2">
              <Link href="/users">
                <Button size="sm" className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Manage Staff
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Station Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Station Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stations && stations.length > 0 ? (
              stations.slice(0, 3).map((station: any) => (
                <div key={station.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{station.name}</p>
                    <p className="text-xs text-gray-500">{station.address || station.region || 'No location'}</p>
                  </div>
                  <Badge variant={station.isActive !== false ? "secondary" : "outline"}>
                    {station.isActive !== false ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No stations found</p>
                <p className="text-xs">Create your first station to get started</p>
              </div>
            )}
            {stations && stations.length > 3 && (
              <div className="pt-2">
                <Link href="/stations">
                  <Button variant="outline" size="sm" className="w-full">
                    View All {stations.length} Stations
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Incident Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t('incidents')} Overview
            <Badge variant="outline" className="ml-auto text-xs">Real-time</Badge>
          </CardTitle>
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
                <AlertTriangle className="h-3 w-3" />
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
            <div className="pt-2">
              <Link href="/incidents">
                <Button size="sm" className="w-full">
                  View All Incidents
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/stations">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <MapPin className="h-5 w-5" />
                <span className="text-sm">Manage Stations</span>
              </Button>
            </Link>
            <Link href="/users">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Users className="h-5 w-5" />
                <span className="text-sm">Manage Users</span>
              </Button>
            </Link>
            <Link href="/invitations">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <UserPlus className="h-5 w-5" />
                <span className="text-sm">Send Invitations</span>
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm">View Analytics</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};