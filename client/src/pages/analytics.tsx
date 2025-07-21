import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Building, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Download,
  Target,
  Calendar,
  Shield,
  RefreshCw
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { format } from "date-fns";
import { getIncidentStats, getUsers, getOrganizations } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface AdvancedAnalyticsData {
  totalIncidents: number;
  averageResponseTime: number;
  resolutionRate: number;
  priorityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  statusDistribution: {
    pending: number;
    assigned: number;
    in_progress: number;
    resolved: number;
    escalated: number;
  };
  dailyTrends: Array<{
    date: string;
    incidents: number;
    resolved: number;
    critical: number;
  }>;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  totalIncidents: number;
  resolvedIncidents: number;
  resolutionRate: number;
  responseTimeByPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  incidentsByStatus: {
    pending: number;
    assigned: number;
    in_progress: number;
    resolved: number;
    escalated: number;
  };
}

interface ResourceAllocation {
  stationId: number;
  stationName: string;
  totalStaff: number;
  activeStaff: number;
  assignedIncidents: number;
  workloadPercentage: number;
  averageResponseTime: number;
}

interface IncidentHeatmapData {
  latitude: number;
  longitude: number;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeRange: string;
}

interface PredictiveAnalytics {
  forecastedIncidents: {
    date: string;
    predictedCount: number;
    confidence: number;
  }[];
  trendAnalysis: {
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercentage: number;
    periodComparison: string;
  };
  riskZones: {
    latitude: number;
    longitude: number;
    riskLevel: number;
    incidentTypes: string[];
  }[];
}

const COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#65a30d',
  pending: '#6b7280',
  assigned: '#3b82f6',
  in_progress: '#f59e0b',
  resolved: '#10b981',
  escalated: '#ef4444'
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('30d');
  const [refreshInterval, setRefreshInterval] = useState(30000);

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getIncidentStats,
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getUsers,
  });

  const { data: organizations } = useQuery({
    queryKey: ['/api/organizations'],
    queryFn: getOrganizations,
    enabled: user?.role === 'main_admin'
  });

  const { data: advancedAnalytics, isLoading: analyticsLoading, error: analyticsError, refetch: refetchAdvanced } = useQuery<AdvancedAnalyticsData>({
    queryKey: ['/api/analytics/advanced', timeframe],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/analytics/advanced?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      return data;
    },
    enabled: user?.role === 'main_admin' || user?.role === 'super_admin',
    refetchInterval: refreshInterval,
  });

  // Fetch performance metrics
  const { data: performanceMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<PerformanceMetrics>({
    queryKey: [`/api/analytics/performance?timeframe=${timeframe}`],
    refetchInterval: refreshInterval,
  });

  // Fetch resource allocation
  const { data: resourceAllocation, isLoading: resourceLoading, refetch: refetchResources } = useQuery<ResourceAllocation[]>({
    queryKey: ['/api/analytics/resource-allocation'],
    refetchInterval: refreshInterval,
  });

  // Fetch heatmap data
  const { data: heatmapData, isLoading: heatmapLoading, refetch: refetchHeatmap } = useQuery<IncidentHeatmapData[]>({
    queryKey: [`/api/analytics/heatmap?timeframe=${timeframe}`],
    refetchInterval: refreshInterval,
  });

  // Fetch predictive analytics
  const { data: predictiveData, isLoading: predictiveLoading, refetch: refetchPredictive } = useQuery<PredictiveAnalytics>({
    queryKey: ['/api/analytics/predictive'],
    refetchInterval: refreshInterval,
  });

  // Debug logging


  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter((u: any) => u.isActive).length || 0;
  const usersByRole = users?.reduce((acc: any, user: any) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {}) || {};

  const resolutionRate = stats?.total ? Math.round((stats.resolved / stats.total) * 100) : 0;
  const pendingRate = stats?.total ? Math.round((stats.pending / stats.total) * 100) : 0;

  const hasAdvancedAccess = user?.role === 'main_admin' || user?.role === 'super_admin';

  // Helper functions
  const refreshAll = () => {
    refetchAdvanced();
    refetchMetrics();
    refetchResources();
    refetchHeatmap();
    refetchPredictive();
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500',
      assigned: 'bg-blue-500',
      in_progress: 'bg-orange-500',
      resolved: 'bg-green-500',
      escalated: 'bg-red-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const exportData = () => {
    if (!advancedAnalytics) return;
    
    const csvData = [
      ['Metric', 'Value'],
      ['Total Incidents', advancedAnalytics.totalIncidents.toString()],
      ['Average Response Time (min)', advancedAnalytics.averageResponseTime.toFixed(1)],
      ['Resolution Rate (%)', advancedAnalytics.resolutionRate.toFixed(1)],
      ['Critical Priority', advancedAnalytics.priorityDistribution.critical.toString()],
      ['High Priority', advancedAnalytics.priorityDistribution.high.toString()],
      ['Medium Priority', advancedAnalytics.priorityDistribution.medium.toString()],
      ['Low Priority', advancedAnalytics.priorityDistribution.low.toString()],
      ['Pending Status', advancedAnalytics.statusDistribution.pending.toString()],
      ['Assigned Status', advancedAnalytics.statusDistribution.assigned.toString()],
      ['In Progress Status', advancedAnalytics.statusDistribution.in_progress.toString()],
      ['Resolved Status', advancedAnalytics.statusDistribution.resolved.toString()],
      ['Escalated Status', advancedAnalytics.statusDistribution.escalated.toString()],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeframe}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const priorityData = advancedAnalytics ? [
    { name: 'Critical', value: advancedAnalytics.priorityDistribution.critical, color: COLORS.critical },
    { name: 'High', value: advancedAnalytics.priorityDistribution.high, color: COLORS.high },
    { name: 'Medium', value: advancedAnalytics.priorityDistribution.medium, color: COLORS.medium },
    { name: 'Low', value: advancedAnalytics.priorityDistribution.low, color: COLORS.low },
  ].filter(item => item.value > 0) : [];

  const statusData = advancedAnalytics ? [
    { name: 'Pending', value: advancedAnalytics.statusDistribution.pending, color: COLORS.pending },
    { name: 'Assigned', value: advancedAnalytics.statusDistribution.assigned, color: COLORS.assigned },
    { name: 'In Progress', value: advancedAnalytics.statusDistribution.in_progress, color: COLORS.in_progress },
    { name: 'Resolved', value: advancedAnalytics.statusDistribution.resolved, color: COLORS.resolved },
    { name: 'Escalated', value: advancedAnalytics.statusDistribution.escalated, color: COLORS.escalated },
  ].filter(item => item.value > 0) : [];

  return (
    <DashboardLayout title="Analytics" subtitle="Comprehensive system insights and performance metrics">
      <div className="space-y-6">
        {/* Analytics Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time insights, performance metrics, and predictive analytics
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={refreshAll} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="predictive">Predictive</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Key Performance Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {advancedAnalytics?.totalIncidents || stats?.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {advancedAnalytics?.statusDistribution.resolved || stats?.resolved || 0} resolved
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {advancedAnalytics?.averageResponseTime 
                      ? formatTime(advancedAnalytics.averageResponseTime)
                      : performanceMetrics 
                      ? formatTime(performanceMetrics.averageResponseTime)
                      : '--'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last {timeframe}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {advancedAnalytics?.resolutionRate 
                      ? `${Math.round(advancedAnalytics.resolutionRate)}%`
                      : `${resolutionRate}%`}
                  </div>
                  <Progress 
                    value={advancedAnalytics?.resolutionRate || resolutionRate} 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    of {totalUsers} total users
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Priority and Status Distribution Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                  <CardDescription>Breakdown of incidents by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {priorityData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={priorityData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {priorityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                          <p>No priority data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>Current status breakdown of all incidents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    {statusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6">
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                          <p>No status data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {/* Performance Metrics */}
            {performanceMetrics && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Response Time by Priority</CardTitle>
                    <CardDescription>Average response times across incident priorities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { priority: 'Critical', time: performanceMetrics.responseTimeByPriority.critical },
                          { priority: 'High', time: performanceMetrics.responseTimeByPriority.high },
                          { priority: 'Medium', time: performanceMetrics.responseTimeByPriority.medium },
                          { priority: 'Low', time: performanceMetrics.responseTimeByPriority.low },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="priority" />
                          <YAxis />
                          <Tooltip formatter={(value) => [formatTime(value as number), 'Response Time']} />
                          <Bar dataKey="time" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics Summary</CardTitle>
                    <CardDescription>Key performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Incidents</span>
                        <Badge>{performanceMetrics.totalIncidents}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Resolved</span>
                        <Badge variant="secondary">{performanceMetrics.resolvedIncidents}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Resolution Rate</span>
                        <Badge variant="outline">{Math.round(performanceMetrics.resolutionRate)}%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Avg Response Time</span>
                        <Badge>{formatTime(performanceMetrics.averageResponseTime)}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resource Allocation</CardTitle>
                <CardDescription>Staff workload and availability across stations</CardDescription>
              </CardHeader>
              <CardContent>
                {resourceLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {resourceAllocation?.map((station) => (
                      <div key={station.stationId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">{station.stationName}</h3>
                          <Badge variant={station.workloadPercentage > 80 ? 'destructive' : station.workloadPercentage > 60 ? 'default' : 'secondary'}>
                            {Math.round(station.workloadPercentage)}% workload
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Staff</p>
                            <p className="font-medium">{station.totalStaff}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Active</p>
                            <p className="font-medium">{station.activeStaff}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Assigned</p>
                            <p className="font-medium">{station.assignedIncidents}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Response</p>
                            <p className="font-medium">{formatTime(station.averageResponseTime)}</p>
                          </div>
                        </div>
                        
                        <Progress value={station.workloadPercentage} className="mt-3" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily Incident Trends</CardTitle>
                <CardDescription>Daily incident volume and resolution tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {advancedAnalytics?.dailyTrends && advancedAnalytics.dailyTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={advancedAnalytics.dailyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="incidents" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.3}
                          name="Total Incidents"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="resolved" 
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.3}
                          name="Resolved"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                        <p>No data available for the selected period</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="predictive" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Predictive Analytics</CardTitle>
                <CardDescription>Forecasted incident trends and risk analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {predictiveLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : predictiveData ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Trend Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            {predictiveData.trendAnalysis.trend === 'increasing' && (
                              <TrendingUp className="h-4 w-4 text-red-500" />
                            )}
                            {predictiveData.trendAnalysis.trend === 'decreasing' && (
                              <TrendingDown className="h-4 w-4 text-green-500" />
                            )}
                            {predictiveData.trendAnalysis.trend === 'stable' && (
                              <BarChart3 className="h-4 w-4 text-blue-500" />
                            )}
                            <span className="text-sm capitalize">{predictiveData.trendAnalysis.trend}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.abs(predictiveData.trendAnalysis.changePercentage)}% change
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {predictiveData.forecastedIncidents && predictiveData.forecastedIncidents.length > 0 && (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={predictiveData.forecastedIncidents}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                            />
                            <YAxis />
                            <Tooltip 
                              labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="predictedCount" 
                              stroke="#8884d8" 
                              strokeWidth={2}
                              name="Predicted Incidents"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                      <p>No predictive data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}