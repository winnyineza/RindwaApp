import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Target,
  TrendingUp,
  Award,
  Timer,
  MapPin,
  FileText,
  Activity,
  Loader2
} from 'lucide-react';
import { getIncidentStats, getIncidents } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';

export const StationStaffWidgets = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getIncidentStats,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: incidents, isLoading: incidentsLoading, error: incidentsError } = useQuery({
    queryKey: ['/api/incidents'],
    queryFn: getIncidents,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Show loading state
  if (statsLoading || incidentsLoading) {
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
  if (statsError || incidentsError) {
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
              {incidentsError && <p className="text-red-600">• Failed to load incidents</p>}
              <p className="text-gray-600 mt-4">Please refresh the page or contact support if the issue persists.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate real-time metrics based on actual incidents
  const currentUserId = user?.userId || user?.id;
  const myAssignedIncidents = incidents?.filter(incident => {
    return incident.assignedToId === currentUserId || incident.assignedTo === currentUserId;
  }) || [];

  const myCompletedToday = myAssignedIncidents.filter(incident => {
    const today = new Date();
    const incidentDate = new Date(incident.updatedAt || incident.createdAt);
    return incident.status === 'resolved' && 
           incidentDate.toDateString() === today.toDateString();
  }).length;

  const myHighPriority = myAssignedIncidents.filter(incident => 
    incident.priority === 'high' || incident.priority === 'critical'
  ).length;

  const myMediumPriority = myAssignedIncidents.filter(incident => 
    incident.priority === 'medium'
  ).length;

  const myLowPriority = myAssignedIncidents.filter(incident => 
    incident.priority === 'low'
  ).length;

  const myResolvedIncidents = myAssignedIncidents.filter(incident => 
    incident.status === 'resolved'
  ).length;

  const myInProgressIncidents = myAssignedIncidents.filter(incident => 
    incident.status === 'in_progress'
  ).length;

  const myPendingIncidents = myAssignedIncidents.filter(incident => 
    incident.status === 'pending' || incident.status === 'assigned'
  ).length;

  const successRate = myAssignedIncidents.length > 0 ? 
    Math.round((myResolvedIncidents / myAssignedIncidents.length) * 100) : 0;

  // Calculate average response time (for resolved incidents)
  const avgResponseTime = myResolvedIncidents > 0 ? 
    Math.round(myAssignedIncidents
      .filter(incident => incident.status === 'resolved')
      .reduce((total, incident) => {
        const start = new Date(incident.createdAt);
        const end = new Date(incident.updatedAt || incident.createdAt);
        return total + (end.getTime() - start.getTime());
      }, 0) / myResolvedIncidents / (1000 * 60)) : 0;

  const weeklyTarget = 10; // Set a reasonable weekly target
  const weeklyCompleted = myResolvedIncidents;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* My Assignments Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            My Assignments
            <Badge variant="outline" className="ml-auto">Live</Badge>
          </CardTitle>
          <CardDescription>
            Your current incident assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Assigned</span>
              <span className="font-bold text-blue-600">{myAssignedIncidents.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">In Progress</span>
              <span className="font-bold text-orange-600">{myInProgressIncidents}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed Today</span>
              <span className="font-bold text-green-600">{myCompletedToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Success Rate</span>
              <span className="font-bold">{successRate}%</span>
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
            <Badge variant="outline" className="ml-auto text-xs">Real-time</Badge>
          </CardTitle>
          <CardDescription>
            Your work performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Success Rate</span>
                <span>{successRate}%</span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Weekly Progress</span>
                <span>{Math.round((weeklyCompleted / weeklyTarget) * 100)}%</span>
              </div>
              <Progress value={Math.min((weeklyCompleted / weeklyTarget) * 100, 100)} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-lg font-bold text-green-600">{myResolvedIncidents}</div>
                <p className="text-xs text-gray-600">Resolved</p>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-lg font-bold text-blue-600">{avgResponseTime}m</div>
                <p className="text-xs text-gray-600">Avg Time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Priority Breakdown
          </CardTitle>
          <CardDescription>
            Your assignments by priority level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm">High Priority</span>
              </div>
              <Badge variant={myHighPriority > 0 ? "destructive" : "secondary"}>
                {myHighPriority}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Medium Priority</span>
              </div>
              <Badge variant={myMediumPriority > 0 ? "default" : "secondary"}>
                {myMediumPriority}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Low Priority</span>
              </div>
              <Badge variant="secondary">{myLowPriority}</Badge>
            </div>
            <div className="pt-2">
              <Link href="/incidents">
                <Button size="sm" className="w-full">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  View All Cases
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Activity
          </CardTitle>
          <CardDescription>
            Your work summary for today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending Tasks
              </span>
              <Badge variant={myPendingIncidents > 0 ? "destructive" : "secondary"}>
                {myPendingIncidents}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-1">
                <Activity className="h-3 w-3" />
                In Progress
              </span>
              <Badge variant={myInProgressIncidents > 0 ? "default" : "secondary"}>
                {myInProgressIncidents}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Completed Today
              </span>
              <Badge variant="secondary">{myCompletedToday}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Response Time
              </span>
              <span className="text-sm font-medium">{avgResponseTime}m avg</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Assignments */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Assignments
            <Badge variant="outline" className="ml-auto text-xs">Live</Badge>
          </CardTitle>
          <CardDescription>
            Your most recently assigned incidents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {myAssignedIncidents.length > 0 ? (
              myAssignedIncidents.slice(0, 4).map((incident: any) => (
                <div key={incident.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{incident.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(incident.createdAt).toLocaleDateString()} • {incident.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        incident.priority === 'critical' || incident.priority === 'high' 
                          ? "destructive" 
                          : incident.priority === 'medium' 
                          ? "default" 
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {incident.priority}
                    </Badge>
                    <Badge 
                      variant={
                        incident.status === 'resolved' 
                          ? "secondary" 
                          : incident.status === 'in_progress' 
                          ? "default" 
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {incident.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No incidents assigned yet</p>
                <p className="text-xs">New assignments will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for station staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Link href="/incidents">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardList className="h-4 w-4 mr-2" />
                My Incidents
              </Button>
            </Link>
            <Link href="/incident-workflow">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="h-4 w-4 mr-2" />
                Workflow
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Reports
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" className="w-full justify-start">
                <Award className="h-4 w-4 mr-2" />
                My Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};