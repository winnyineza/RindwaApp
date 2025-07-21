import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  PieChart,
  FileText,
  Activity,
  Target
} from "lucide-react";
import { getIncidentStats, getUsers } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { formatDate } from "@/lib/dateUtils";

export default function ReportsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getIncidentStats,
    refetchInterval: 30000, // Real-time updates every 30 seconds
    refetchOnWindowFocus: true,
  });

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getUsers,
    refetchInterval: 30000, // Real-time updates every 30 seconds
    refetchOnWindowFocus: true,
  });

  const stationUsers = users?.filter((u: any) => u.stationId === user?.stationId) || [];
  const stationStaff = stationUsers.filter((u: any) => u.role === 'station_staff');

  // Calculate real metrics from authentic data
  const reportMetrics = {
    totalIncidents: stats?.total || 0,
    resolvedIncidents: stats?.resolved || 0,
    pendingIncidents: stats?.pending || 0,
    inProgressIncidents: stats?.inProgress || 0,
    resolutionRate: stats?.total ? Math.round((stats.resolved / stats.total) * 100) : 0,
    staffCount: stationStaff.length,
    avgResponseTime: 0, // No response time data yet
    totalUsers: stationUsers.length
  };

  const handleExportReport = (reportType: string) => {
    // Generate CSV content with real data
    const csvContent = `Station Report - ${reportType}\n` +
      `Generated: ${formatDate(new Date())}\n\n` +
      `Total Incidents,${reportMetrics.totalIncidents}\n` +
      `Resolved,${reportMetrics.resolvedIncidents}\n` +
      `Pending,${reportMetrics.pendingIncidents}\n` +
      `In Progress,${reportMetrics.inProgressIncidents}\n` +
      `Resolution Rate,${reportMetrics.resolutionRate}%\n` +
      `Staff Count,${reportMetrics.staffCount}\n` +
      `Total Users,${reportMetrics.totalUsers}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `station-report-${reportType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout 
      title="Reports & Analytics" 
      subtitle={user ? `${user.firstName} ${user.lastName}, review your station's performance insights and export data` : "Station performance insights and data export"}
    >
      <div className="space-y-6">
        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Total Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{reportMetrics.totalIncidents}</div>
              <p className="text-xs text-muted-foreground">All time incidents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4" />
                Resolution Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{reportMetrics.resolutionRate}%</div>
              <Progress value={reportMetrics.resolutionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                Active Staff
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{reportMetrics.staffCount}</div>
              <p className="text-xs text-muted-foreground">Station staff members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{reportMetrics.avgResponseTime}m</div>
              <p className="text-xs text-muted-foreground">Average response time</p>
            </CardContent>
          </Card>
        </div>

        {/* Report Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="staff">Staff Performance</TabsTrigger>
            <TabsTrigger value="export">Export Data</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Incident Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm">Pending</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{reportMetrics.pendingIncidents}</span>
                        <Badge variant="secondary">{reportMetrics.totalIncidents > 0 ? Math.round((reportMetrics.pendingIncidents / reportMetrics.totalIncidents) * 100) : 0}%</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">In Progress</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{reportMetrics.inProgressIncidents}</span>
                        <Badge variant="secondary">{reportMetrics.totalIncidents > 0 ? Math.round((reportMetrics.inProgressIncidents / reportMetrics.totalIncidents) * 100) : 0}%</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Resolved</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{reportMetrics.resolvedIncidents}</span>
                        <Badge variant="secondary">{reportMetrics.totalIncidents > 0 ? Math.round((reportMetrics.resolvedIncidents / reportMetrics.totalIncidents) * 100) : 0}%</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Station Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Overall Performance</span>
                        <span className="font-medium">{reportMetrics.resolutionRate}%</span>
                      </div>
                      <Progress value={reportMetrics.resolutionRate} className="h-2" />
                    </div>
                    <div className="pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Active Cases</span>
                        <span className="font-medium">{reportMetrics.pendingIncidents + reportMetrics.inProgressIncidents}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Staff Utilization</span>
                        <span className="font-medium">{reportMetrics.staffCount > 0 ? 'Active' : 'No Staff'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Users</span>
                        <span className="font-medium">{reportMetrics.totalUsers}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Incident Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{reportMetrics.pendingIncidents}</div>
                    <p className="text-sm text-muted-foreground mt-2">Pending Cases</p>
                    <p className="text-xs text-muted-foreground">Awaiting assignment</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{reportMetrics.inProgressIncidents}</div>
                    <p className="text-sm text-muted-foreground mt-2">Active Cases</p>
                    <p className="text-xs text-muted-foreground">Currently being handled</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">{reportMetrics.resolvedIncidents}</div>
                    <p className="text-sm text-muted-foreground mt-2">Resolved Cases</p>
                    <p className="text-xs text-muted-foreground">Successfully completed</p>
                  </div>
                </div>
                {reportMetrics.totalIncidents === 0 && (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No incident data available yet</p>
                    <p className="text-sm text-muted-foreground">Reports will appear here once incidents are created</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Performance Tab */}
          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staff Performance Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stationStaff.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium">Team Overview</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Total Staff</span>
                              <span className="font-medium">{stationStaff.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Active Members</span>
                              <span className="font-medium">{stationStaff.filter((s: any) => s.isActive).length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Cases per Staff</span>
                              <span className="font-medium">{stationStaff.length > 0 ? Math.round(reportMetrics.totalIncidents / stationStaff.length) : 0}</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Performance Metrics</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Avg Response Time</span>
                              <span className="font-medium">{reportMetrics.avgResponseTime}m</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Resolution Rate</span>
                              <span className="font-medium">{reportMetrics.resolutionRate}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Team Efficiency</span>
                              <span className="font-medium">{reportMetrics.resolutionRate > 0 ? 'Good' : 'No Data'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Staff Members</h4>
                        <div className="space-y-2">
                          {stationStaff.map((staff: any) => (
                            <div key={staff.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div>
                                <p className="font-medium">{staff.firstName} {staff.lastName}</p>
                                <p className="text-sm text-muted-foreground">{staff.email}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant={staff.isActive ? "default" : "secondary"}>
                                  {staff.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">0 assigned cases</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No staff members assigned yet</p>
                      <p className="text-sm text-muted-foreground">Staff performance reports will appear here once staff are assigned</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Export Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Incident Summary Report</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Complete overview of all incidents, status distribution, and key metrics
                      </p>
                      <Button onClick={() => handleExportReport('Incident-Summary')} className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Export Incident Report
                      </Button>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Staff Performance Report</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Detailed staff performance metrics and individual statistics
                      </p>
                      <Button onClick={() => handleExportReport('Staff-Performance')} className="w-full" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Staff Report
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Station Analytics Report</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Complete station performance analysis and trends
                      </p>
                      <Button onClick={() => handleExportReport('Station-Analytics')} className="w-full" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Analytics Report
                      </Button>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Custom Report</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Generate custom reports with specific date ranges and filters
                      </p>
                      <Button onClick={() => handleExportReport('Custom')} className="w-full" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Custom Report
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Export Information</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Reports are exported in CSV format for easy analysis</li>
                    <li>• All data is based on current database records</li>
                    <li>• Reports include real-time statistics and metrics</li>
                    <li>• Files are automatically named with current date</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}