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
  FileText
} from 'lucide-react';
import { getIncidentStats, getIncidents } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';

export const StationStaffWidgets = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getIncidentStats,
  });

  const { data: incidents } = useQuery({
    queryKey: ['/api/incidents'],
    queryFn: getIncidents,
  });

  // Calculate real-time metrics based on actual incidents
  const myAssignedIncidents = incidents?.filter(incident => {
    const currentUserId = user?.userId || user?.id;
    return incident.assignedToId === currentUserId;
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

  const staffMetrics = {
    assignedCases: myAssignedIncidents.length,
    completedToday: myCompletedToday,
    avgResponseTime: avgResponseTime,
    successRate: successRate,
    totalResolved: myResolvedIncidents,
    pendingCases: stats?.pending || 0,
    weeklyTarget: 10, // Set a reasonable weekly target
    weeklyCompleted: myResolvedIncidents,
    highPriority: myHighPriority,
    mediumPriority: myMediumPriority,
    lowPriority: myLowPriority,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* My Workload */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            My Workload
          </CardTitle>
          <CardDescription>
            Track your assigned cases and daily progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{staffMetrics.assignedCases}</div>
              <p className="text-sm text-muted-foreground">Assigned Cases</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{staffMetrics.completedToday}</div>
              <p className="text-sm text-muted-foreground">Completed Today</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{staffMetrics.pendingCases}</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{staffMetrics.avgResponseTime}m</div>
              <p className="text-sm text-muted-foreground">Avg Response</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/incidents">
              <Button>
                <AlertTriangle className="h-4 w-4 mr-2" />
                View My Cases
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            My Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Success Rate</span>
              <span className="font-bold">{staffMetrics.successRate}%</span>
            </div>
            <Progress value={staffMetrics.successRate} className="h-2" />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Resolved</span>
                <span className="font-medium">{staffMetrics.totalResolved}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Response Time</span>
                <Badge variant="secondary">{staffMetrics.avgResponseTime}m avg</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Target */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Weekly Target
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {staffMetrics.weeklyCompleted}/{staffMetrics.weeklyTarget}
              </div>
              <p className="text-sm text-gray-600">Cases Completed</p>
            </div>
            <Progress 
              value={(staffMetrics.weeklyCompleted / staffMetrics.weeklyTarget) * 100} 
              className="h-2" 
            />
            <div className="text-center">
              <Badge variant="outline">
                {staffMetrics.weeklyTarget - staffMetrics.weeklyCompleted} remaining
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Cases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Active Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-1">
                <Clock className="h-3 w-3" />
                High Priority
              </span>
              <Badge variant="destructive">{staffMetrics.highPriority}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Medium Priority
              </span>
              <Badge variant="secondary">{staffMetrics.mediumPriority}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Low Priority
              </span>
              <Badge variant="outline">{staffMetrics.lowPriority}</Badge>
            </div>
            <div className="mt-4 text-center">
              <Link href="/incident-history">
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  View All Cases
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Board */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievement Board
          </CardTitle>
          <CardDescription>
            Your accomplishments and recognition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-500">No achievements yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Complete your first incident to unlock achievements
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-500">No scheduled tasks</p>
            <p className="text-sm text-gray-400 mt-2">
              Your daily assignments will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};