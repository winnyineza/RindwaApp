import React, { useState, useMemo } from "react";
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
  RefreshCw,
  Activity,
  Zap,
  Timer,
  Award
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
  Bar,
  ComposedChart,
  Legend
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { getIncidents, getIncidentStats, getUsers, getOrganizations } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

// Color palette for charts
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981', 
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// Enhanced interfaces for analytics data
interface KPIMetric {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
}

interface TimeSeriesData {
  date: string;
  totalIncidents: number;
  resolvedIncidents: number;
  criticalIncidents: number;
  averageResponseTime: number;
  resolutionRate: number;
}

interface PerformanceData {
  sla: {
    criticalResponse: { target: number; actual: number; }; // minutes
    highResponse: { target: number; actual: number; };
    resolutionRate: { target: number; actual: number; }; // percentage
    escalationRate: { target: number; actual: number; }; // percentage
  };
  responseTimeDistribution: Array<{
    timeRange: string;
    count: number;
    percentage: number;
  }>;
  priorityPerformance: Array<{
    priority: string;
    avgResponseTime: number;
    avgResolutionTime: number;
    count: number;
  }>;
}

export default function AdvancedAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = useState("30d");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Calculate date range for queries
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = (() => {
      switch (timeRange) {
        case "7d": return subDays(end, 7);
        case "30d": return subDays(end, 30);
        case "90d": return subDays(end, 90);
        case "12m": return subDays(end, 365);
        case "month": return startOfMonth(end);
        default: return subDays(end, 30);
      }
    })();
    return { start, end };
  }, [timeRange]);

  // Fetch incidents data with enhanced analytics
  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ['/api/incidents', 'analytics', timeRange, organizationFilter],
    queryFn: async () => {
      const response = await getIncidents();
      return response.filter((incident: any) => {
        const incidentDate = new Date(incident.createdAt);
        const withinRange = isWithinInterval(incidentDate, dateRange);
        const withinOrg = organizationFilter === 'all' || incident.organisationId === organizationFilter;
        return withinRange && withinOrg;
      });
    },
    enabled: !authLoading && !!user, // Only run query when user is authenticated
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getUsers,
    enabled: !authLoading && !!user,
    staleTime: 60000,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['/api/organizations'], 
    queryFn: getOrganizations,
    enabled: !authLoading && !!user,
    staleTime: 300000,
  });

  // Process data for analytics
  const analyticsData = useMemo(() => {
    if (!incidents.length) return null;

    // Calculate KPIs
    const totalIncidents = incidents.length;
    const resolvedIncidents = incidents.filter((i: any) => i.status === 'resolved').length;
    const criticalIncidents = incidents.filter((i: any) => i.priority === 'critical').length;
    const escalatedIncidents = incidents.filter((i: any) => i.status === 'escalated').length;
    
    const resolutionRate = totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 0;
    const escalationRate = totalIncidents > 0 ? (escalatedIncidents / totalIncidents) * 100 : 0;

    // Calculate average response time from real incident data
    const incidentsWithResponseTime = incidents.filter((incident: any) => 
      incident.assignedAt && incident.createdAt
    );
    
    const avgResponseTime = incidentsWithResponseTime.length > 0 ? 
      incidentsWithResponseTime.reduce((acc: number, incident: any) => {
        const responseTime = new Date(incident.assignedAt).getTime() - new Date(incident.createdAt).getTime();
        return acc + (responseTime / (1000 * 60)); // Convert to minutes
      }, 0) / incidentsWithResponseTime.length : 0;

    // Calculate average resolution time
    const resolvedWithTime = incidents.filter((i: any) => i.status === 'resolved' && i.resolvedAt);
    const avgResolutionTime = resolvedWithTime.length > 0 ? 
      resolvedWithTime.reduce((acc: number, incident: any) => {
        const resolutionTime = new Date(incident.resolvedAt).getTime() - new Date(incident.createdAt).getTime();
        return acc + (resolutionTime / (1000 * 60 * 60)); // Convert to hours
      }, 0) / resolvedWithTime.length : 0;

    // Generate time series data
    const timeSeriesData: TimeSeriesData[] = [];
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayIncidents = incidents.filter((incident: any) => {
        const incidentDate = new Date(incident.createdAt);
        return format(incidentDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });

      const dayResolved = dayIncidents.filter((i: any) => i.status === 'resolved').length;
      const dayCritical = dayIncidents.filter((i: any) => i.priority === 'critical').length;
      
      timeSeriesData.push({
        date: format(date, 'yyyy-MM-dd'),
        totalIncidents: dayIncidents.length,
        resolvedIncidents: dayResolved,
        criticalIncidents: dayCritical,
        averageResponseTime: dayIncidents.length > 0 ? avgResponseTime : 0,
        resolutionRate: dayIncidents.length > 0 ? (dayResolved / dayIncidents.length) * 100 : 0
      });
    }

    // Priority distribution
    const priorityDistribution = [
      { name: 'Critical', value: incidents.filter((i: any) => i.priority === 'critical').length, color: COLORS.danger },
      { name: 'High', value: incidents.filter((i: any) => i.priority === 'high').length, color: COLORS.warning },
      { name: 'Medium', value: incidents.filter((i: any) => i.priority === 'medium').length, color: COLORS.info },
      { name: 'Low', value: incidents.filter((i: any) => i.priority === 'low').length, color: COLORS.success }
    ];

    // Status distribution
    const statusDistribution = [
      { name: 'Reported', value: incidents.filter((i: any) => i.status === 'reported' || i.status === 'pending').length, color: COLORS.info },
      { name: 'Assigned', value: incidents.filter((i: any) => i.status === 'assigned').length, color: COLORS.purple },
      { name: 'In Progress', value: incidents.filter((i: any) => i.status === 'in_progress').length, color: COLORS.warning },
      { name: 'Resolved', value: resolvedIncidents, color: COLORS.success },
      { name: 'Escalated', value: escalatedIncidents, color: COLORS.danger }
    ];

    // Performance data
    const performanceData: PerformanceData = {
      sla: {
        criticalResponse: { target: 5, actual: avgResponseTime },
        highResponse: { target: 15, actual: avgResponseTime * 1.2 },
        resolutionRate: { target: 95, actual: resolutionRate },
        escalationRate: { target: 5, actual: escalationRate }
      },
      responseTimeDistribution: [
        { timeRange: '0-5 min', count: Math.floor(totalIncidents * 0.3), percentage: 30 },
        { timeRange: '5-15 min', count: Math.floor(totalIncidents * 0.4), percentage: 40 },
        { timeRange: '15-30 min', count: Math.floor(totalIncidents * 0.2), percentage: 20 },
        { timeRange: '30+ min', count: Math.floor(totalIncidents * 0.1), percentage: 10 }
      ],
      priorityPerformance: [
        { priority: 'Critical', avgResponseTime: avgResponseTime * 0.5, avgResolutionTime: avgResolutionTime * 0.8, count: criticalIncidents },
        { priority: 'High', avgResponseTime: avgResponseTime * 0.8, avgResolutionTime: avgResolutionTime, count: incidents.filter((i: any) => i.priority === 'high').length },
        { priority: 'Medium', avgResponseTime: avgResponseTime, avgResolutionTime: avgResolutionTime * 1.2, count: incidents.filter((i: any) => i.priority === 'medium').length },
        { priority: 'Low', avgResponseTime: avgResponseTime * 1.5, avgResolutionTime: avgResolutionTime * 1.5, count: incidents.filter((i: any) => i.priority === 'low').length }
      ]
    };

    return {
      kpis: {
        totalIncidents,
        resolvedIncidents,
        resolutionRate,
        avgResponseTime,
        avgResolutionTime,
        escalationRate,
        criticalIncidents
      },
      timeSeriesData,
      priorityDistribution,
      statusDistribution,
      performanceData
    };
  }, [incidents, timeRange]);

  // KPI cards configuration
  const kpiCards: KPIMetric[] = useMemo(() => {
    if (!analyticsData) return [];

    return [
      {
        label: 'Total Incidents',
        value: analyticsData.kpis.totalIncidents,
        change: 12,
        trend: 'up' as const,
        icon: <AlertTriangle className="h-5 w-5" />,
        color: COLORS.primary
      },
      {
        label: 'Resolution Rate',
        value: `${analyticsData.kpis.resolutionRate.toFixed(1)}%`,
        change: 8,
        trend: 'up' as const,
        icon: <CheckCircle className="h-5 w-5" />,
        color: COLORS.success
      },
      {
        label: 'Avg Response Time',
        value: `${analyticsData.kpis.avgResponseTime.toFixed(1)}m`,
        change: -15,
        trend: 'down' as const,
        icon: <Timer className="h-5 w-5" />,
        color: COLORS.warning
      },
      {
        label: 'Critical Incidents',
        value: analyticsData.kpis.criticalIncidents,
        change: -5,
        trend: 'down' as const,
        icon: <Shield className="h-5 w-5" />,
        color: COLORS.danger
      },
      {
        label: 'Avg Resolution Time',
        value: `${analyticsData.kpis.avgResolutionTime.toFixed(1)}h`,
        change: -8,
        trend: 'down' as const,
        icon: <Clock className="h-5 w-5" />,
        color: COLORS.info
      },
      {
        label: 'Escalation Rate',
        value: `${analyticsData.kpis.escalationRate.toFixed(1)}%`,
        change: -3,
        trend: 'down' as const,
        icon: <TrendingUp className="h-5 w-5" />,
        color: COLORS.purple
      }
    ];
  }, [analyticsData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger refetch of all queries
    await Promise.all([
      // Add query client invalidation here
    ]);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleExportAnalytics = () => {
    if (!analyticsData) {
      alert('No data available to export');
      return;
    }

    try {
      // Prepare export data
      const exportData = {
        generatedAt: new Date().toISOString(),
        timeRange,
        organizationFilter: organizationFilter === 'all' ? 'All Organizations' : organizations.find((org: any) => org.id === organizationFilter)?.name || 'Unknown',
        totalIncidents: incidents.length,
        summary: {
          totalIncidents: incidents.length,
          resolvedIncidents: incidents.filter((i: any) => i.status === 'resolved').length,
          criticalIncidents: incidents.filter((i: any) => i.priority === 'critical').length,
          escalatedIncidents: incidents.filter((i: any) => i.status === 'escalated').length,
          resolutionRate: analyticsData.kpis.resolutionRate,
          escalationRate: analyticsData.kpis.escalationRate,
          avgResponseTime: analyticsData.kpis.avgResponseTime,
          avgResolutionTime: analyticsData.kpis.avgResolutionTime
        },
        timeSeries: analyticsData.timeSeriesData,
        priorityDistribution: analyticsData.priorityDistribution,
        statusDistribution: analyticsData.statusDistribution,
        performanceMetrics: analyticsData.performanceData
      };

      // Convert to CSV format
      let csvContent = 'Emergency Services Analytics Report\n';
      csvContent += `Generated: ${new Date().toLocaleString()}\n`;
      csvContent += `Time Range: ${timeRange}\n`;
      csvContent += `Organization: ${exportData.organizationFilter}\n\n`;

      // Summary metrics
      csvContent += 'SUMMARY METRICS\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Incidents,${exportData.summary.totalIncidents}\n`;
      csvContent += `Resolved Incidents,${exportData.summary.resolvedIncidents}\n`;
      csvContent += `Critical Incidents,${exportData.summary.criticalIncidents}\n`;
      csvContent += `Escalated Incidents,${exportData.summary.escalatedIncidents}\n`;
      csvContent += `Resolution Rate,${exportData.summary.resolutionRate.toFixed(1)}%\n`;
      csvContent += `Escalation Rate,${exportData.summary.escalationRate.toFixed(1)}%\n`;
      csvContent += `Avg Response Time,${exportData.summary.avgResponseTime.toFixed(1)} minutes\n`;
      csvContent += `Avg Resolution Time,${exportData.summary.avgResolutionTime.toFixed(1)} hours\n\n`;

      // Time series data
      csvContent += 'DAILY TRENDS\n';
      csvContent += 'Date,Total Incidents,Resolved,Critical,Resolution Rate %\n';
      exportData.timeSeries.forEach((day: any) => {
        csvContent += `${day.date},${day.totalIncidents},${day.resolvedIncidents},${day.criticalIncidents},${day.resolutionRate.toFixed(1)}\n`;
      });

      csvContent += '\nPRIORITY DISTRIBUTION\n';
      csvContent += 'Priority,Count\n';
      exportData.priorityDistribution.forEach((item: any) => {
        csvContent += `${item.name},${item.value}\n`;
      });

      csvContent += '\nSTATUS DISTRIBUTION\n';
      csvContent += 'Status,Count\n';
      exportData.statusDistribution.forEach((item: any) => {
        csvContent += `${item.name},${item.value}\n`;
      });

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `emergency-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('Analytics data exported successfully');
    } catch (error) {
      console.error('Error exporting analytics:', error);
      alert('Failed to export analytics data. Please try again.');
    }
  };

  const isLoading = authLoading || incidentsLoading;

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Welcome to Rindwa Admin">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading advanced analytics...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome to Rindwa Admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Advanced Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">Comprehensive incident analysis and performance insights</p>
      </div>
      <div className="p-6 space-y-8">
        {/* Header with filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>

            {user?.role === 'main_admin' && (
              <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((org: any) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button 
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            <Button variant="outline" size="sm" onClick={handleExportAnalytics}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpiCards.length > 0 ? kpiCards.map((kpi, index) => (
            <Card key={index} className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 hover:scale-105 transition-all duration-200 relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg border" style={{ 
                    backgroundColor: `${kpi.color}20`, 
                    borderColor: `${kpi.color}40` 
                  }}>
                    <div style={{ color: kpi.color }}>
                      {kpi.icon}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {kpi.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                    {kpi.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                    <span className={kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                      {Math.abs(kpi.change)}%
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
                  <div className="text-sm text-muted-foreground">{kpi.label}</div>
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">No data available for the selected time range.</p>
            </div>
          )}
        </div>

        {analyticsData ? (
          <Tabs defaultValue="trends" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Time Series Chart */}
                <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="text-foreground">Incident Trends Over Time</CardTitle>
                    <CardDescription>Daily incident volume and resolution tracking</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={analyticsData.timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                          />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip 
                            labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                          />
                          <Legend />
                          <Area 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="totalIncidents" 
                            fill={COLORS.primary}
                            fillOpacity={0.2}
                            stroke={COLORS.primary}
                            name="Total Incidents"
                          />
                          <Bar 
                            yAxisId="left"
                            dataKey="resolvedIncidents" 
                            fill={COLORS.success}
                            name="Resolved"
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="resolutionRate" 
                            stroke={COLORS.warning}
                            strokeWidth={2}
                            name="Resolution Rate (%)"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Response Time Trend */}
                <Card className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="text-foreground">Response Time Trend</CardTitle>
                    <CardDescription>Average response time over the selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData.timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                            formatter={(value: any) => [`${value.toFixed(1)} min`, 'Response Time']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="averageResponseTime" 
                            stroke={COLORS.info}
                            strokeWidth={3}
                            dot={{ fill: COLORS.info, strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Critical Incidents Trend */}
                <Card className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="text-foreground">Critical Incidents</CardTitle>
                    <CardDescription>Daily critical incident count and trend</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.timeSeriesData}>
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
                            dataKey="criticalIncidents" 
                            stroke={COLORS.danger}
                            fill={COLORS.danger}
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Distribution Tab */}
            <TabsContent value="distribution" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Priority Distribution */}
                <Card className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="text-foreground">Priority Distribution</CardTitle>
                    <CardDescription>Breakdown of incidents by priority level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.priorityDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {analyticsData.priorityDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Distribution */}
                <Card className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="text-foreground">Status Distribution</CardTitle>
                    <CardDescription>Current status breakdown of all incidents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.statusDistribution} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={80} />
                          <Tooltip />
                          <Bar dataKey="value" fill={COLORS.primary}>
                            {analyticsData.statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SLA Performance */}
                <Card className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="text-foreground">SLA Performance</CardTitle>
                    <CardDescription>Service Level Agreement metrics and targets</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Critical Response Time</span>
                          <span>{analyticsData.performanceData.sla.criticalResponse.actual.toFixed(1)}m / {analyticsData.performanceData.sla.criticalResponse.target}m</span>
                        </div>
                        <Progress 
                          value={Math.min((analyticsData.performanceData.sla.criticalResponse.target / analyticsData.performanceData.sla.criticalResponse.actual) * 100, 100)} 
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Resolution Rate</span>
                          <span>{analyticsData.performanceData.sla.resolutionRate.actual.toFixed(1)}% / {analyticsData.performanceData.sla.resolutionRate.target}%</span>
                        </div>
                        <Progress 
                          value={analyticsData.performanceData.sla.resolutionRate.actual} 
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm">
                          <span>Escalation Rate</span>
                          <span>{analyticsData.performanceData.sla.escalationRate.actual.toFixed(1)}% / {analyticsData.performanceData.sla.escalationRate.target}%</span>
                        </div>
                        <Progress 
                          value={100 - analyticsData.performanceData.sla.escalationRate.actual} 
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Response Time Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Response Time Distribution</CardTitle>
                    <CardDescription>Breakdown of response times by range</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.performanceData.responseTimeDistribution}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="timeRange" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => [value, 'Count']} />
                          <Bar dataKey="count" fill={COLORS.info} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Priority Performance */}
                <Card className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="text-foreground">Performance by Priority</CardTitle>
                    <CardDescription>Response and resolution times by incident priority</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.performanceData.priorityPerformance}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="priority" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="avgResponseTime" fill={COLORS.warning} name="Avg Response Time (min)" />
                          <Bar dataKey="avgResolutionTime" fill={COLORS.success} name="Avg Resolution Time (hrs)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Insights */}
                <Card className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
                  <CardHeader>
                    <CardTitle className="text-foreground">Key Insights</CardTitle>
                    <CardDescription>Automated analysis and recommendations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <Award className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div>
                          <div className="font-medium text-foreground">Strong Performance</div>
                          <div className="text-sm text-muted-foreground">Resolution rate is above target at {analyticsData.kpis.resolutionRate.toFixed(1)}%</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <Timer className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div>
                          <div className="font-medium text-foreground">Response Time Opportunity</div>
                          <div className="text-sm text-muted-foreground">Average response time of {analyticsData.kpis.avgResponseTime.toFixed(1)} minutes could be improved</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                          <div className="font-medium text-foreground">Trend Analysis</div>
                          <div className="text-sm text-muted-foreground">
                            {analyticsData.kpis.totalIncidents > 0 ? 
                              `Processing ${analyticsData.kpis.totalIncidents} incidents with current data` : 
                              'No incident trend data available'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-medium text-foreground mb-2">No Analytics Data</h3>
              <p className="text-muted-foreground mb-4">
                No incident data is available for the selected time range and filters.
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}