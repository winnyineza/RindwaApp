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
  TrendingUp
} from 'lucide-react';
import { getIncidentStats, getStations, getUsers } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';

export const SuperAdminWidgets = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getIncidentStats,
  });

  const { data: stations } = useQuery({
    queryKey: ['/api/stations'],
    queryFn: () => getStations(user?.organizationId),
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getUsers,
  });

  const organizationUsers = users?.filter((u: any) => u.organizationId === user?.organizationId) || [];
  const stationAdmins = organizationUsers.filter((u: any) => u.role === 'station_admin');
  const stationStaff = organizationUsers.filter((u: any) => u.role === 'station_staff');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Organization Overview */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Organization Overview
          </CardTitle>
          <CardDescription>
            Manage your organization's stations and personnel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stations?.length || 0}</div>
              <p className="text-sm text-gray-600">{t('stations')}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stationAdmins.length}</div>
              <p className="text-sm text-gray-600">Station Admins</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stationStaff.length}</div>
              <p className="text-sm text-gray-600">Station Staff</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href="/stations">
              <Button size="sm" variant="outline">
                <MapPin className="h-4 w-4 mr-2" />
                Manage Stations
              </Button>
            </Link>
            <Link href="/users">
              <Button size="sm" variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Staff
              </Button>
            </Link>
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
            {stations?.slice(0, 3).map((station: any) => (
              <div key={station.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{station.name}</p>
                  <p className="text-xs text-gray-500">{station.location}</p>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Incident Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t('incidents')} Overview
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
              <Badge variant="destructive">{stats?.pending || 0}</Badge>
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

      {/* Station Status Dashboard */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Station Status Dashboard
          </CardTitle>
          <CardDescription>
            Monitor all stations under your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stations?.map((station: any) => (
              <div key={station.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{station.name}</h4>
                  <Badge variant="outline">Online</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{station.location}</p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {organizationUsers.filter((u: any) => u.stationId === station.id).length} Staff
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Active Cases
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};