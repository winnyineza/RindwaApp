import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  MapPin,
  FileText,
  Target,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";

// Enhanced interface for resolved incidents with resolution metrics
interface ResolvedIncident {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'resolved'; // Always resolved
  location: {
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  stationId: string;
  organisationId: string;
  reportedById: string;
  assignedTo: string | null;
  assignedBy: string | null;
  assignedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string;
  createdAt: string;
  updatedAt: string;
  
  // User names for display
  reportedByName: string;
  assignedToName: string | null;
  assignedByName: string | null;
  resolvedByName: string | null;
  
  // Organization context
  stationName: string;
  organizationName: string;
  
  // Resolution metrics
  resolutionTimeMinutes: number;
  timeToAssignmentMinutes: number | null;
}

export default function IncidentHistory() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState("all");
  const [assignedToFilter, setAssignedToFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Fetch only resolved incidents
  const { data: resolvedIncidents = [], isLoading, error } = useQuery({
    queryKey: ['/api/incidents', 'resolved'],
    queryFn: async () => {
      const response = await apiRequest('/api/incidents?status=resolved&include_resolution_metrics=true');
      return response.json();
    },
    refetchInterval: 30000, // Slower refresh for historical data
    refetchOnWindowFocus: true,
  });

  // Calculate resolution metrics
  const resolutionMetrics = useMemo(() => {
    if (!resolvedIncidents.length) return null;

    const totalIncidents = resolvedIncidents.length;
    const totalResolutionTime = resolvedIncidents.reduce((sum: number, incident: ResolvedIncident) => sum + incident.resolutionTimeMinutes, 0);
    const avgResolutionTime = totalResolutionTime / totalIncidents;

    // Time-based analysis
    const last24Hours = resolvedIncidents.filter((incident: ResolvedIncident) => {
      const resolvedDate = new Date(incident.resolvedAt);
      const now = new Date();
      return differenceInHours(now, resolvedDate) <= 24;
    }).length;

    const lastWeek = resolvedIncidents.filter((incident: ResolvedIncident) => {
      const resolvedDate = new Date(incident.resolvedAt);
      const now = new Date();
      return differenceInDays(now, resolvedDate) <= 7;
    }).length;

    const lastMonth = resolvedIncidents.filter((incident: ResolvedIncident) => {
      const resolvedDate = new Date(incident.resolvedAt);
      const now = new Date();
      return differenceInDays(now, resolvedDate) <= 30;
    }).length;

    // Priority breakdown
    const byPriority = resolvedIncidents.reduce((acc: any, incident: ResolvedIncident) => {
      acc[incident.priority] = (acc[incident.priority] || 0) + 1;
      return acc;
    }, {});

    // Quick resolution cases (< 1 hour)
    const quickResolutions = resolvedIncidents.filter((incident: ResolvedIncident) => 
      incident.resolutionTimeMinutes < 60
    ).length;

    return {
      totalIncidents,
      avgResolutionTime: Math.round(avgResolutionTime),
      last24Hours,
      lastWeek,
      lastMonth,
      byPriority,
      quickResolutions,
      quickResolutionRate: Math.round((quickResolutions / totalIncidents) * 100)
    };
  }, [resolvedIncidents]);

  // Filter resolved incidents
  const filteredIncidents = useMemo(() => {
    return resolvedIncidents.filter((incident: ResolvedIncident) => {
      const matchesSearch = !searchTerm || 
        incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.reportedByName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPriority = priorityFilter === "all" || incident.priority === priorityFilter;
      const matchesType = typeFilter === "all" || incident.type === typeFilter;
      const matchesAssignedTo = assignedToFilter === "all" || incident.assignedToName === assignedToFilter;

      const matchesTimeRange = (() => {
        if (timeRangeFilter === "all") return true;
        const resolvedDate = new Date(incident.resolvedAt);
        const now = new Date();
        
        switch (timeRangeFilter) {
          case "today": return differenceInDays(now, resolvedDate) === 0;
          case "week": return differenceInDays(now, resolvedDate) <= 7;
          case "month": return differenceInDays(now, resolvedDate) <= 30;
          case "quarter": return differenceInDays(now, resolvedDate) <= 90;
          default: return true;
        }
      })();

      return matchesSearch && matchesPriority && matchesType && matchesTimeRange && matchesAssignedTo;
    });
  }, [resolvedIncidents, searchTerm, priorityFilter, typeFilter, timeRangeFilter, assignedToFilter]);

  // Get unique values for filters
  const uniqueTypes = useMemo(() => 
    Array.from(new Set(resolvedIncidents.map((i: ResolvedIncident) => i.type))) as string[], 
    [resolvedIncidents]
  );
  
  const uniqueAssignees = useMemo(() => 
    Array.from(new Set(resolvedIncidents.map((i: ResolvedIncident) => i.assignedToName).filter(Boolean))) as string[], 
    [resolvedIncidents]
  );

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      critical: { variant: "destructive" as const, label: t('critical'), className: "bg-red-100 text-red-800" },
      high: { variant: "destructive" as const, label: t('high'), className: "bg-orange-100 text-orange-800" },
      medium: { variant: "default" as const, label: t('medium'), className: "bg-yellow-100 text-yellow-800" },
      low: { variant: "outline" as const, label: t('low'), className: "bg-green-100 text-green-800" }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || { variant: "outline" as const, label: priority, className: "" };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const formatResolutionTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.round(minutes / 1440)}d ${Math.round((minutes % 1440) / 60)}h`;
  };

  const getResolutionEfficiency = (minutes: number, priority: string) => {
    // Expected resolution times by priority (in minutes)
    const expectedTimes = {
      critical: 60,    // 1 hour
      high: 240,       // 4 hours  
      medium: 720,     // 12 hours
      low: 1440        // 24 hours
    };
    
    const expected = expectedTimes[priority as keyof typeof expectedTimes] || 720;
    const efficiency = (expected / minutes) * 100;
    
    if (efficiency >= 120) return { label: "Excellent", color: "text-green-600", icon: "🏆" };
    if (efficiency >= 100) return { label: "Good", color: "text-blue-600", icon: "✅" };
    if (efficiency >= 80) return { label: "Fair", color: "text-yellow-600", icon: "⚡" };
    return { label: "Needs Improvement", color: "text-red-600", icon: "⚠️" };
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Welcome to Rindwa Admin">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading resolved incidents history...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Welcome to Rindwa Admin">
        <div className="p-6">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-red-600 mb-2">Failed to load incident history</p>
            <p className="text-gray-600 dark:text-gray-400">Please try refreshing the page</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

      return (
      <DashboardLayout title="Dashboard" subtitle="Welcome to Rindwa Admin">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Incident History</h1>
          <p className="text-gray-600 dark:text-gray-400">Complete record of all resolved incidents and their resolution metrics</p>
        </div>
        <div className="flex justify-end mb-6">
          <Badge variant="outline" className="px-3 py-1 text-sm">
            <BarChart3 className="h-4 w-4 mr-1" />
            {filteredIncidents.length} Resolved Cases
          </Badge>
        </div>

        {/* Resolution Metrics Summary Cards */}
        {resolutionMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Resolved</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resolutionMetrics.totalIncidents}</div>
                <p className="text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {resolutionMetrics.last24Hours} in last 24h
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatResolutionTime(resolutionMetrics.avgResolutionTime)}</div>
                <p className="text-xs text-gray-600 mt-1">
                  Across all priority levels
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quick Resolutions</CardTitle>
                <Target className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resolutionMetrics.quickResolutionRate}%</div>
                <p className="text-xs text-gray-600 mt-1">
                  {resolutionMetrics.quickResolutions} resolved within 1 hour
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <Calendar className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resolutionMetrics.lastWeek}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {resolutionMetrics.lastMonth} this month
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Resolved Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search incidents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {uniqueAssignees.map(assignee => (
                    <SelectItem key={assignee} value={assignee || ''}>{assignee}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Resolved Incidents Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resolved Incidents ({filteredIncidents.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredIncidents.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-600">No resolved incidents found</p>
                <p className="text-gray-500">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Incident</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Resolved By</TableHead>
                      <TableHead>Resolution Time</TableHead>
                      <TableHead>Efficiency</TableHead>
                      <TableHead>Resolved Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncidents.map((incident: ResolvedIncident) => {
                      const efficiency = getResolutionEfficiency(incident.resolutionTimeMinutes, incident.priority);
                      return (
                        <React.Fragment key={incident.id}>
                          <TableRow 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => setExpandedRow(expandedRow === incident.id ? null : incident.id)}
                          >
                            <TableCell>
                              {expandedRow === incident.id ? 
                                <ChevronUp className="h-4 w-4" /> : 
                                <ChevronDown className="h-4 w-4" />
                              }
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900 truncate max-w-[200px]">{incident.title}</p>
                                <p className="text-sm text-gray-500 flex items-center mt-1">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {incident.location.address}
                                </p>
                              </div>  
                            </TableCell>
                            <TableCell>{getPriorityBadge(incident.priority)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{incident.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1 text-gray-400" />
                                <span className="text-sm">{incident.resolvedByName || 'Unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">
                                {formatResolutionTime(incident.resolutionTimeMinutes)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-1 ${efficiency.color}`}>
                                <span>{efficiency.icon}</span>
                                <span className="text-sm font-medium">{efficiency.label}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {format(parseISO(incident.resolvedAt), 'MMM dd, yyyy')}
                                <div className="text-xs text-gray-500">
                                  {format(parseISO(incident.resolvedAt), 'HH:mm')}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {expandedRow === incident.id && (
                            <TableRow>
                              <TableCell colSpan={8} className="bg-gray-50">
                                <div className="p-4 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Incident Details */}
                                    <div className="space-y-3">
                                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Incident Details
                                      </h4>
                                      <div className="space-y-2 text-sm">
                                        <div><strong>Description:</strong> {incident.description}</div>
                                        <div><strong>Station:</strong> {incident.stationName}</div>
                                        <div><strong>Organization:</strong> {incident.organizationName}</div>
                                        <div><strong>Reported By:</strong> {incident.reportedByName}</div>
                                        <div><strong>Created:</strong> {format(parseISO(incident.createdAt), 'MMM dd, yyyy HH:mm')}</div>
                                      </div>
                                    </div>
                                    
                                    {/* Resolution Timeline */}
                                    <div className="space-y-3">
                                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Resolution Timeline
                                      </h4>
                                      <div className="space-y-2 text-sm">
                                        {incident.assignedAt && (
                                          <div>
                                            <strong>Assigned:</strong> {format(parseISO(incident.assignedAt), 'MMM dd, yyyy HH:mm')}
                                            {incident.assignedByName && (
                                              <span className="text-gray-600"> by {incident.assignedByName}</span>
                                            )}
                                            {incident.timeToAssignmentMinutes && (
                                              <div className="text-xs text-gray-500 mt-1">
                                                Time to assignment: {formatResolutionTime(incident.timeToAssignmentMinutes)}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        <div>
                                          <strong>Resolved:</strong> {format(parseISO(incident.resolvedAt), 'MMM dd, yyyy HH:mm')}
                                          <div className="text-xs text-gray-500 mt-1">
                                            Total resolution time: {formatResolutionTime(incident.resolutionTimeMinutes)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
    </DashboardLayout>
  );
}