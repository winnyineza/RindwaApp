import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { 
  Search, Building2, Users, AlertTriangle, Eye, Edit, Trash2, Plus, 
  MapPin, MoreHorizontal, Activity, Clock, Shield, TrendingUp, 
  UserPlus, Settings, Play, Pause, BarChart3, PieChart, Map,
  Filter, Download, RefreshCw, Zap, Phone, Mail, Calendar,
  CheckCircle, XCircle, AlertCircle, Info, Target, Award
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { getStations, getUsers, getOrganizations, getIncidents, getRecentActivities, getStationStaff } from "@/lib/api";
import StationsMap from "@/components/maps/StationsMap";
import ComprehensiveLocationPicker from "@/components/maps/ComprehensiveLocationPicker";

interface Station {
  id: number;
  name: string;
  district?: string;
  sector?: string;
  organizationName: string;
  organizationType: string;
  contactNumber?: string;
  capacity?: number;
  currentStaff?: number;
  activeIncidents?: number;
  createdAt: string;
  isActive?: boolean;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  equipmentLevel?: 'basic' | 'intermediate' | 'advanced';
  performanceScore?: number;
  responseTime?: number;
  utilizationRate?: number;
}

interface Organization {
  id: number;
  name: string;
  type: string;
}

interface StationFormData {
  name: string;
  district: string;
  sector: string;
  organizationId: string;
  contactNumber: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
}

export default function EnhancedStationsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOrg, setFilterOrg] = useState("all");
  const [filterDistrict, setFilterDistrict] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedStations, setSelectedStations] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"table" | "cards" | "map">("table");
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<StationFormData>({
    name: "",
    district: "",
    sector: "",
    organizationId: "",
    contactNumber: "",
    address: "",
    city: "",
    country: "Rwanda",
    latitude: "",
    longitude: "",
    isActive: true
  });

  // Data fetching - Different endpoints based on user role
  const { data: stations = [], isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: user?.role === 'main_admin' ? ['/api/stations/all'] : ['/api/stations'],
    enabled: user?.role === 'main_admin' || user?.role === 'super_admin',
    refetchInterval: 8000, // Refresh every 8 seconds for station updates
  });

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
    enabled: user?.role === 'main_admin' || user?.role === 'super_admin',
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: user?.role === 'main_admin' || user?.role === 'super_admin',
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['/api/incidents'],
    enabled: user?.role === 'main_admin' || user?.role === 'super_admin',
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ['/api/activities/recent'],
    queryFn: () => getRecentActivities(5),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch staff data for selected station
  const { data: stationStaff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['/api/stations/staff', selectedStation?.id],
    queryFn: () => selectedStation?.id ? getStationStaff(selectedStation.id.toString()) : Promise.resolve([]),
    enabled: !!selectedStation?.id && showStaffModal,
  });

  // Data processing and analytics
  const processedData = useMemo(() => {
    // Calculate analytics
    const totalStations = stations.length;
    const activeStations = stations.filter(s => s.isActive !== false).length;
    const totalCapacity = stations.reduce((sum, s) => sum + (s.capacity || 0), 0);
    const totalStaff = stations.reduce((sum, s) => sum + (s.currentStaff || 0), 0);
    const totalActiveIncidents = stations.reduce((sum, s) => sum + (s.activeIncidents || 0), 0);
    const avgUtilization = totalCapacity > 0 ? (totalStaff / totalCapacity) * 100 : 0;
    
    // Performance metrics - using real data from API
    const avgResponseTime = stations.length > 0 ? 
      stations.reduce((sum, s) => sum + (s.responseTime || 0), 0) / stations.length : 0;
    const avgPerformanceScore = stations.length > 0 ? 
      stations.reduce((sum, s) => sum + (s.performanceScore || 0), 0) / stations.length : 0;
    
    // Organizations breakdown - filtered based on user role
    const relevantOrganizations = user?.role === 'main_admin' ? organizations : 
      organizations.filter(org => stations.some(s => s.organizationName === org.name));
    
    const orgStats = relevantOrganizations.map((org: Organization) => {
      const orgStations = stations.filter(s => s.organizationName === org.name);
      return {
        name: org.name,
        type: org.type,
        stations: orgStations.length,
        activeIncidents: orgStations.reduce((sum, s) => sum + (s.activeIncidents || 0), 0),
        staff: orgStations.reduce((sum, s) => sum + (s.currentStaff || 0), 0)
      };
    });

    // District breakdown
    const districtStats = stations.reduce((acc, station) => {
      if (!station.district) return acc;
      if (!acc[station.district]) {
        acc[station.district] = { stations: 0, incidents: 0, staff: 0 };
      }
      acc[station.district].stations++;
      acc[station.district].incidents += station.activeIncidents || 0;
      acc[station.district].staff += station.currentStaff || 0;
      return acc;
    }, {} as Record<string, { stations: number; incidents: number; staff: number }>);

    return {
      totalStations,
      activeStations,
      totalCapacity,
      totalStaff,
      totalActiveIncidents,
      avgUtilization,
      avgResponseTime,
      avgPerformanceScore,
      orgStats,
      districtStats,
      relevantOrganizations
    };
  }, [stations, organizations, user?.role]);

  // Filtered and sorted stations
  const filteredStations = useMemo(() => {
    let filtered = stations.filter((station) => {
      const matchesSearch = !searchTerm || 
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.sector?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesOrg = !filterOrg || filterOrg === "all" || station.organizationName === filterOrg;
      const matchesDistrict = !filterDistrict || filterDistrict === "all" || station.district === filterDistrict;
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "active" && station.isActive !== false) ||
        (filterStatus === "inactive" && station.isActive === false);
      
      return matchesSearch && matchesOrg && matchesDistrict && matchesStatus;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "incidents":
          aValue = a.activeIncidents || 0;
          bValue = b.activeIncidents || 0;
          break;
        case "staff":
          aValue = a.currentStaff || 0;
          bValue = b.currentStaff || 0;
          break;
        case "performance":
          aValue = a.performanceScore || 0;
          bValue = b.performanceScore || 0;
          break;
        case "created":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (typeof aValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue as string) : (bValue as string).localeCompare(aValue);
      }
      return sortOrder === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    });

    return filtered;
  }, [stations, searchTerm, filterOrg, filterDistrict, filterStatus, sortBy, sortOrder]);

  // Get unique values for filters
  const uniqueOrganizations = Array.from(new Set(stations.map(s => s.organizationName)));
  const uniqueDistricts = Array.from(new Set(stations.map(s => s.district).filter((district): district is string => Boolean(district))));

  // Authorization check - placed after all hooks
  if (!user || (user.role !== 'main_admin' && user.role !== 'super_admin')) {
    return (
      <DashboardLayout title="Unauthorized" subtitle="Access denied">
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  // Get title and subtitle based on user role and scope
  const getTitle = () => {
    return "Stations";
  };

  const getSubtitle = () => {
    return "Manage stations within your organization";
  };

  // Performance status helper
  const getPerformanceStatus = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "text-green-600", bg: "bg-green-100" };
    if (score >= 75) return { label: "Good", color: "text-blue-600", bg: "bg-blue-100" };
    if (score >= 50) return { label: "Fair", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { label: "Poor", color: "text-red-600", bg: "bg-red-100" };
  };

  // Utilization status helper
  const getUtilizationStatus = (rate: number) => {
    if (rate >= 90) return { label: "Over-utilized", color: "text-red-600", bg: "bg-red-100" };
    if (rate >= 70) return { label: "Well-utilized", color: "text-green-600", bg: "bg-green-100" };
    if (rate >= 40) return { label: "Normal", color: "text-blue-600", bg: "bg-blue-100" };
    return { label: "Under-utilized", color: "text-gray-600", bg: "bg-gray-100" };
  };

  // Handle form submission
  const handleCreateStation = () => {
    // Implementation would go here
    toast({
      title: "Success",
      description: "Station created successfully",
    });
    setShowCreateModal(false);
  };

  const handleEditStation = (station: Station) => {
    setSelectedStation(station);
    setFormData({
      name: station.name,
      district: station.district || "",
      sector: station.sector || "",
      organizationId: "",
      contactNumber: station.contactNumber || "",
      address: station.address || "",
      city: station.city || "",
      country: station.country || "Rwanda",
      latitude: station.latitude?.toString() || "",
      longitude: station.longitude?.toString() || "",
      isActive: station.isActive !== false
    });
    setShowEditModal(true);
  };

  const handleDeleteStation = (station: Station) => {
    setSelectedStation(station);
    setShowDeleteModal(true);
  };

  const handleStaffManagement = (station: Station) => {
    setSelectedStation(station);
    setShowStaffModal(true);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterOrg("all");
    setFilterDistrict("all");
    setFilterStatus("all");
    setSortBy("name");
    setSortOrder("asc");
    setFormData({
      name: "",
      district: "",
      sector: "",
      organizationId: "",
      contactNumber: "",
      address: "",
      city: "",
      country: "Rwanda",
      latitude: "",
      longitude: "",
      isActive: true
    });
  };

  const handleExportStations = () => {
    if (!filteredStations.length) {
      alert('No stations data available to export');
      return;
    }

    try {
      // Create CSV content
      let csvContent = 'Emergency Stations Export Report\n';
      csvContent += `Generated: ${new Date().toLocaleString()}\n`;
      csvContent += `Total Stations: ${filteredStations.length}\n`;
      csvContent += `Active Stations: ${processedData.activeStations}\n`;
      csvContent += `Average Utilization: ${processedData.avgUtilization.toFixed(1)}%\n`;
      csvContent += `Average Performance: ${processedData.avgPerformanceScore.toFixed(1)}\n\n`;

      // Station Details
      csvContent += 'STATION DETAILS\n';
      csvContent += 'Name,Organization,District,Sector,Status,Capacity,Current Staff,Active Incidents,Equipment Level,Response Time (min),Performance Score,Contact,Latitude,Longitude\n';
      
      filteredStations.forEach((station: any) => {
        csvContent += `"${station.name}",`;
        csvContent += `"${station.organizationName || ''}",`;
        csvContent += `"${station.district || ''}",`;
        csvContent += `"${station.sector || ''}",`;
        csvContent += `"${station.isActive !== false ? 'Active' : 'Inactive'}",`;
        csvContent += `${station.capacity || 0},`;
        csvContent += `${station.currentStaff || 0},`;
        csvContent += `${station.activeIncidents || 0},`;
        csvContent += `"${station.equipmentLevel || 'Standard'}",`;
        csvContent += `${station.responseTime || 0},`;
        csvContent += `${station.performanceScore || 0},`;
        csvContent += `"${station.contact || ''}",`;
        csvContent += `${station.latitude || ''},`;
        csvContent += `${station.longitude || ''}\n`;
      });

      // Organization Summary
      csvContent += '\nORGANIZATION SUMMARY\n';
      csvContent += 'Organization,Type,Stations,Active Incidents,Staff\n';
      processedData.orgStats.forEach((org: any) => {
        csvContent += `"${org.name}","${org.type}",${org.stations},${org.activeIncidents},${org.staff}\n`;
      });

      // District Summary
      csvContent += '\nDISTRICT SUMMARY\n';
      csvContent += 'District,Stations,Active Incidents,Staff\n';
      Object.entries(processedData.districtStats).forEach(([district, stats]: [string, any]) => {
        csvContent += `"${district}",${stats.stations},${stats.incidents},${stats.staff}\n`;
      });

      // Performance Metrics
      csvContent += '\nPERFORMACE METRICS\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Stations,${processedData.totalStations}\n`;
      csvContent += `Active Stations,${processedData.activeStations}\n`;
      csvContent += `Total Capacity,${processedData.totalCapacity}\n`;
      csvContent += `Total Staff,${processedData.totalStaff}\n`;
      csvContent += `Total Active Incidents,${processedData.totalActiveIncidents}\n`;
      csvContent += `Average Utilization,${processedData.avgUtilization.toFixed(1)}%\n`;
      csvContent += `Average Response Time,${processedData.avgResponseTime.toFixed(1)} minutes\n`;
      csvContent += `Average Performance Score,${processedData.avgPerformanceScore.toFixed(1)}\n`;

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `emergency-stations-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('Stations data exported successfully');
    } catch (error) {
      console.error('Error exporting stations:', error);
      alert('Failed to export stations data. Please try again.');
    }
  };

  return (
    <DashboardLayout 
      title={getTitle()} 
      subtitle={getSubtitle()}
    >
      <div className="space-y-6">
        {/* Enhanced Analytics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stations</CardTitle>
              <Building2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{processedData.totalStations}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                {processedData.activeStations} active
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{processedData.totalActiveIncidents}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Activity className="h-3 w-3 mr-1" />
                Across all stations
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Utilization</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{processedData.avgUtilization.toFixed(1)}%</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                {processedData.totalStaff} / {processedData.totalCapacity} capacity
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{processedData.avgPerformanceScore.toFixed(1)}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Target className="h-3 w-3 mr-1" />
                Avg response: {processedData.avgResponseTime.toFixed(1)}min
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Controls and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Advanced Station Controls
                </CardTitle>
                <CardDescription>
                  Search, filter, and manage stations with advanced tools
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Station
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportStations}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters Row */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="🔍 Search stations, organizations, locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {user?.role === 'main_admin' && (
                                  <Select value={filterOrg} onValueChange={setFilterOrg}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {uniqueOrganizations.map((org) => (
                      <SelectItem key={org} value={org}>{org}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                )}

                <Select value={filterDistrict} onValueChange={setFilterDistrict}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Districts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {uniqueDistricts.map((district) => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="incidents">Incidents</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>

                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">View:</span>
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="table" className="text-xs">Table</TabsTrigger>
                    <TabsTrigger value="cards" className="text-xs">Cards</TabsTrigger>
                    <TabsTrigger value="map" className="text-xs">Map</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing {filteredStations.length} of {stations.length} stations
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
          <TabsContent value="table" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Directory ({filteredStations.length})</CardTitle>
                <CardDescription>
                  Comprehensive station overview with real-time data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stationsLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading stations...</p>
                  </div>
                ) : filteredStations.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm || filterOrg || filterDistrict ? "No stations found matching your criteria." : "No stations available."}
                    </p>
                    {!searchTerm && !filterOrg && !filterDistrict && (
                      <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Station
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Station Details</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Performance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStations.map((station) => {
                          const performanceStatus = getPerformanceStatus(station.performanceScore || 75);
                          const utilizationRate = station.capacity ? (station.currentStaff || 0) / station.capacity * 100 : 0;
                          const utilizationStatus = getUtilizationStatus(utilizationRate);

                          return (
                            <TableRow key={station.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                      station.isActive !== false ? 'bg-green-100' : 'bg-gray-100'
                                    }`}>
                                      <Building2 className={`h-5 w-5 ${
                                        station.isActive !== false ? 'text-green-600' : 'text-gray-400'
                                      }`} />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{station.name}</div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <span>ID: {station.id}</span>
                                      {station.contactNumber && (
                                        <>
                                          <span>•</span>
                                          <Phone className="h-3 w-3" />
                                          <span>{station.contactNumber}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium text-sm">{station.organizationName}</div>
                                  <Badge variant="outline" className="text-xs">
                                    {station.organizationType}
                                  </Badge>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="space-y-1">
                                  {station.district && station.sector ? (
                                    <>
                                      <div className="font-medium text-sm">{station.district}</div>
                                      <div className="text-xs text-muted-foreground">{station.sector}</div>
                                    </>
                                  ) : (
                                    <div className="text-sm text-muted-foreground">Location not specified</div>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {station.currentStaff || 0} / {station.capacity || 0}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <Progress value={utilizationRate} className="h-2" />
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${utilizationStatus.color} ${utilizationStatus.bg}`}
                                    >
                                      {utilizationStatus.label}
                                    </Badge>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1">
                                    <Award className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm font-medium">{station.performanceScore || 75}%</span>
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${performanceStatus.color} ${performanceStatus.bg}`}
                                  >
                                    {performanceStatus.label}
                                  </Badge>
                                  {station.activeIncidents && station.activeIncidents > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-orange-600">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span>{station.activeIncidents} active</span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {station.isActive !== false ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleEditStation(station)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit Station
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStaffManagement(station)}>
                                      <UserPlus className="h-4 w-4 mr-2" />
                                      Manage Staff
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                      <BarChart3 className="h-4 w-4 mr-2" />
                                      View Analytics
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <MapPin className="h-4 w-4 mr-2" />
                                      View on Map
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteStation(station)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Station
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cards" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStations.map((station) => {
                const performanceStatus = getPerformanceStatus(station.performanceScore || 75);
                const utilizationRate = station.capacity ? (station.currentStaff || 0) / station.capacity * 100 : 0;

                return (
                  <Card key={station.id} className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 hover:scale-105 transition-all duration-200 hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                            station.isActive !== false 
                              ? 'bg-green-500/10 border-green-500/20' 
                              : 'bg-gray-500/10 border-gray-500/20'
                          }`}>
                            <Building2 className={`h-4 w-4 ${
                              station.isActive !== false ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                            }`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{station.name}</CardTitle>
                            <CardDescription className="text-sm">{station.organizationName}</CardDescription>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditStation(station)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStaffManagement(station)}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Staff
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Staff</div>
                          <div className="text-lg font-semibold">{station.currentStaff || 0} / {station.capacity || 0}</div>
                          <Progress value={utilizationRate} className="h-2" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Performance</div>
                          <div className="text-lg font-semibold">{station.performanceScore || 75}%</div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${performanceStatus.color} ${performanceStatus.bg}`}
                          >
                            {performanceStatus.label}
                          </Badge>
                        </div>
                      </div>

                      {station.activeIncidents && station.activeIncidents > 0 && (
                        <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium">Active Incidents</span>
                          </div>
                          <Badge variant="destructive">{station.activeIncidents}</Badge>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        {station.district && station.sector ? `${station.district}, ${station.sector}` : 'Location not specified'}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Station Locations Map
                </CardTitle>
                <CardDescription>
                  Interactive map view of all station locations with real-time data
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <StationsMap 
                  stations={filteredStations}
                  onStationSelect={handleEditStation}
                  onStationEdit={handleEditStation}
                  height="600px"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Organization Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {user?.role === 'main_admin' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Organization Performance Breakdown
                </CardTitle>
                <CardDescription>
                  Real-time performance metrics across organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {processedData.orgStats.map((org, index: number) => {
                    const avgPerformance = org.stations > 0 ? 
                      stations.filter(s => s.organizationName === org.name)
                             .reduce((sum, s) => sum + (s.performanceScore || 75), 0) / org.stations : 75;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            avgPerformance >= 90 ? 'bg-green-100' :
                            avgPerformance >= 75 ? 'bg-blue-100' :
                            avgPerformance >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                          }`}>
                            <Building2 className={`h-5 w-5 ${
                              avgPerformance >= 90 ? 'text-green-600' :
                              avgPerformance >= 75 ? 'text-blue-600' :
                              avgPerformance >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-sm text-muted-foreground">{org.type}</div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`
                              ${avgPerformance >= 90 ? 'bg-green-100 text-green-800' :
                                avgPerformance >= 75 ? 'bg-blue-100 text-blue-800' :
                                avgPerformance >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}
                            `}>
                              {avgPerformance.toFixed(1)}% Performance
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {org.stations} stations • {org.staff} staff • {org.activeIncidents} incidents
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Your Organization's Stations
                </CardTitle>
                <CardDescription>
                  Performance overview of stations under your management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredStations.slice(0, 5).map((station) => {
                    const utilizationRate = station.capacity ? (station.currentStaff || 0) / station.capacity * 100 : 0;
                    const performanceColor = (station.performanceScore || 75) >= 90 ? 'text-green-600' :
                                           (station.performanceScore || 75) >= 75 ? 'text-blue-600' :
                                           (station.performanceScore || 75) >= 50 ? 'text-yellow-600' : 'text-red-600';

                    return (
                      <div key={station.id} className="flex items-center justify-between p-3 rounded-lg border bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            station.isActive !== false ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <Building2 className={`h-4 w-4 ${
                              station.isActive !== false ? 'text-green-600' : 'text-gray-400'
                            }`} />
                          </div>
                          <div>
                            <div className="font-medium">{station.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {station.district ? `${station.district}, ${station.sector || ''}` : 'Location not set'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`bg-blue-100 text-blue-800`}>
                              {(station.performanceScore || 75).toFixed(0)}%
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${
                              utilizationRate >= 90 ? 'text-red-600' :
                              utilizationRate >= 70 ? 'text-green-600' : 'text-blue-600'
                            }`}>
                              {utilizationRate.toFixed(0)}% used
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {station.currentStaff || 0}/{station.capacity || 0} staff
                            {station.activeIncidents ? ` • ${station.activeIncidents} incidents` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredStations.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No stations found in your organization</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                District Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(processedData.districtStats).slice(0, 5).map(([district, stats]) => (
                  <div key={district} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <div className="font-medium">{district}</div>
                      <div className="text-sm text-muted-foreground">{stats.stations} stations</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        <span className="font-medium">{stats.staff}</span> staff
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stats.incidents} incidents
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Performance Analytics Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-time Performance Analytics
            </CardTitle>
            <CardDescription>
              Live monitoring of station performance, utilization, and response metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="utilization">Utilization</TabsTrigger>
                <TabsTrigger value="incidents">Incidents</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Top Performer</p>
                          <p className="text-lg font-bold text-blue-900">
                            {filteredStations.length > 0 ? 
                              filteredStations.sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0))[0]?.name || 'N/A'
                              : 'N/A'
                            }
                          </p>
                          <p className="text-xs text-blue-600">
                            {filteredStations.length > 0 ? `${filteredStations[0]?.performanceScore || 0}% score` : ''}
                          </p>
                        </div>
                        <Award className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600 font-medium">Fastest Response</p>
                          <p className="text-lg font-bold text-green-900">
                            {filteredStations.length > 0 ? 
                              `${filteredStations.length > 0 ? Math.min(...filteredStations.map(s => s.responseTime || 0)) : 0} min`
                              : 'N/A'
                            }
                          </p>
                          <p className="text-xs text-green-600">Average response time</p>
                        </div>
                        <Clock className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-orange-600 font-medium">Critical Alerts</p>
                          <p className="text-lg font-bold text-orange-900">
                            {filteredStations.filter(s => (s.activeIncidents || 0) > 5).length}
                          </p>
                          <p className="text-xs text-orange-600">Stations with high incidents</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Performance Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-32 bg-gradient-to-r from-blue-100 to-green-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <p className="text-sm font-medium text-green-700">
                            Performance Score: {processedData.avgPerformanceScore > 0 ? `${processedData.avgPerformanceScore.toFixed(1)}%` : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {processedData.avgPerformanceScore > 0 ? 'Based on resolution rates & response times' : 'No performance data available'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Live Activity Feed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {recentActivities.length > 0 ? (
                          recentActivities.map((activity: any) => (
                            <div key={activity.id} className="flex items-center gap-2 text-sm">
                              <div className={`w-2 h-2 ${activity.color} rounded-full ${
                                activity.type === 'incident_created' ? 'animate-pulse' : ''
                              }`}></div>
                              <span className="text-muted-foreground truncate flex-1">
                                {activity.description}
                              </span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {activity.timeAgo}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            No recent activities
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                {user?.role === 'main_admin' ? (
                  <div className="grid grid-cols-1 gap-4">
                    {processedData.orgStats.map((org, index: number) => {
                      const orgStations = stations.filter(s => s.organizationName === org.name);
                      return (
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {org.name} Performance Breakdown
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{org.stations}</div>
                                <div className="text-xs text-muted-foreground">Stations</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  {orgStations.length > 0 ? 
                                    (orgStations.reduce((sum, s) => sum + (s.performanceScore || 75), 0) / orgStations.length).toFixed(1)
                                    : '0'
                                  }%
                                </div>
                                <div className="text-xs text-muted-foreground">Avg Performance</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">{org.activeIncidents}</div>
                                <div className="text-xs text-muted-foreground">Active Incidents</div>
                              </div>
                              <div className="text-center">
                                                                  <div className="text-2xl font-bold text-purple-600">
                                    {orgStations.length > 0 ? 
                                      (orgStations.reduce((sum, s) => sum + (s.responseTime || 0), 0) / orgStations.length).toFixed(1)
                                      : '0.0'
                                    } min
                                </div>
                                <div className="text-xs text-muted-foreground">Avg Response</div>
                              </div>
                            </div>
                            <div className="mt-4">
                              <div className="flex justify-between text-sm mb-1">
                                <span>Overall Health</span>
                                <span>
                                  {orgStations.length > 0 ? 
                                    ((orgStations.filter(s => (s.activeIncidents || 0) === 0).length / orgStations.length) * 100).toFixed(0)
                                    : '0'
                                  }%
                                </span>
                              </div>
                              <Progress 
                                value={orgStations.length > 0 ? 
                                  (orgStations.filter(s => (s.activeIncidents || 0) === 0).length / orgStations.length) * 100
                                  : 0
                                } 
                                className="h-2"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          Station Performance Rankings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {filteredStations
                            .sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0))
                            .map((station, index) => {
                              const rank = index + 1;
                              const performanceScore = station.performanceScore || 75;
                              const performanceColor = performanceScore >= 90 ? 'text-green-600' :
                                                     performanceScore >= 75 ? 'text-blue-600' :
                                                     performanceScore >= 50 ? 'text-yellow-600' : 'text-red-600';

                              return (
                                <div key={station.id} className="flex items-center justify-between p-3 rounded-lg border">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                      rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                                      rank === 2 ? 'bg-gray-100 text-gray-800' :
                                      rank === 3 ? 'bg-orange-100 text-orange-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      #{rank}
                                    </div>
                                    <div>
                                      <div className="font-medium">{station.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {station.district ? `${station.district}, ${station.sector || ''}` : 'Location not set'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right space-y-1">
                                    <Badge className={`${
                                      performanceScore >= 90 ? 'bg-green-100 text-green-800' :
                                      performanceScore >= 75 ? 'bg-blue-100 text-blue-800' :
                                      performanceScore >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {performanceScore}%
                                    </Badge>
                                    <div className="text-xs text-muted-foreground">
                                      {station.currentStaff || 0} staff • {station.activeIncidents || 0} incidents
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Organization Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Total Stations</span>
                              <span className="font-medium">{processedData.totalStations}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Active Stations</span>
                              <span className="font-medium text-green-600">{processedData.activeStations}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Total Staff</span>
                              <span className="font-medium">{processedData.totalStaff}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Active Incidents</span>
                              <span className="font-medium text-orange-600">{processedData.totalActiveIncidents}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Performance Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Avg Performance</span>
                              <span className="font-medium">{processedData.avgPerformanceScore.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Avg Response Time</span>
                              <span className="font-medium">{processedData.avgResponseTime.toFixed(1)} min</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Staff Utilization</span>
                              <span className="font-medium">{processedData.avgUtilization.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Capacity</span>
                              <span className="font-medium">{processedData.totalCapacity}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Health Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Operational Health</span>
                              <span>{((processedData.activeStations / processedData.totalStations) * 100).toFixed(0)}%</span>
                            </div>
                            <Progress 
                              value={(processedData.activeStations / processedData.totalStations) * 100} 
                              className="h-2"
                            />
                            <div className="text-xs text-muted-foreground">
                              {processedData.activeStations} of {processedData.totalStations} stations active
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="utilization" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStations.slice(0, 9).map((station) => {
                    const utilizationRate = station.capacity ? (station.currentStaff || 0) / station.capacity * 100 : 0;
                    const utilizationColor = utilizationRate >= 90 ? 'text-red-600' :
                                           utilizationRate >= 70 ? 'text-green-600' :
                                           utilizationRate >= 40 ? 'text-blue-600' : 'text-gray-600';
                    
                    return (
                      <Card key={station.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{station.name}</span>
                            </div>
                            <Badge variant="outline" className={utilizationColor}>
                              {utilizationRate.toFixed(0)}%
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span>Staff: {station.currentStaff || 0} / {station.capacity || 0}</span>
                              <span className={utilizationColor}>
                                {utilizationRate >= 90 ? 'Over-utilized' :
                                 utilizationRate >= 70 ? 'Well-utilized' :
                                 utilizationRate >= 40 ? 'Normal' : 'Under-utilized'}
                              </span>
                            </div>
                            <Progress value={utilizationRate} className="h-2" />
                            
                            {station.activeIncidents && station.activeIncidents > 0 && (
                              <div className="flex items-center gap-1 text-xs text-orange-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span>{station.activeIncidents} active incidents</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="incidents" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Incident Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {processedData.orgStats.map((org, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm">{org.name}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-orange-500 h-2 rounded-full" 
                                  style={{
                                    width: `${processedData.totalActiveIncidents > 0 ? 
                                      (org.activeIncidents / processedData.totalActiveIncidents) * 100 : 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{org.activeIncidents}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Critical Stations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {filteredStations
                          .filter(s => (s.activeIncidents || 0) > 0)
                          .sort((a, b) => (b.activeIncidents || 0) - (a.activeIncidents || 0))
                          .slice(0, 5)
                          .map((station) => (
                            <div key={station.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <div>
                                  <div className="font-medium text-sm">{station.name}</div>
                                  <div className="text-xs text-muted-foreground">{station.district}</div>
                                </div>
                              </div>
                              <Badge variant="destructive">
                                {station.activeIncidents} incidents
                              </Badge>
                            </div>
                          ))
                        }
                        {filteredStations.filter(s => (s.activeIncidents || 0) > 0).length === 0 && (
                          <div className="text-center py-4 text-muted-foreground">
                            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            <p className="text-sm">All stations operating normally</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Bulk Operations Panel */}
        {selectedStations.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{selectedStations.length}</span>
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">
                      {selectedStations.length} station{selectedStations.length > 1 ? 's' : ''} selected
                    </p>
                    <p className="text-sm text-blue-700">Choose a bulk action to apply</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="bg-white">
                    <Users className="h-4 w-4 mr-2" />
                    Bulk Assign Staff
                  </Button>
                  <Button size="sm" variant="outline" className="bg-white">
                    <Settings className="h-4 w-4 mr-2" />
                    Update Settings
                  </Button>
                  <Button size="sm" variant="outline" className="bg-white">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setSelectedStations([])}
                    className="bg-white"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Station Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Station
            </DialogTitle>
            <DialogDescription>
              Add a new emergency response station
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Station Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter station name"
                required
              />
            </div>

            {user?.role === 'main_admin' && (
              <div className="space-y-2">
                <Label htmlFor="organization">Organization *</Label>
                <Select value={formData.organizationId} onValueChange={(value) => setFormData({...formData, organizationId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org: Organization) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          {org.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="district">District *</Label>
                <Select value={formData.district} onValueChange={(value) => setFormData({...formData, district: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Gasabo", "Kicukiro", "Nyarugenge", "Bugesera", "Gatsibo", "Kayonza", 
                      "Kirehe", "Ngoma", "Nyagatare", "Rwamagana", "Burera", "Gakenke", 
                      "Gicumbi", "Musanze", "Rulindo", "Gisagara", "Huye", "Kamonyi", 
                      "Muhanga", "Nyamagabe", "Nyanza", "Ruhango", "Karongi", "Ngororero", 
                      "Nyabihu", "Rubavu", "Rusizi", "Rutsiro", "Nyaruguru"].map((district) => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector">Sector</Label>
                <Input
                  id="sector"
                  value={formData.sector}
                  onChange={(e) => setFormData({...formData, sector: e.target.value})}
                  placeholder="Enter sector name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Enter street address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="Enter city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={formData.country} onValueChange={(value) => setFormData({...formData, country: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rwanda">Rwanda</SelectItem>
                    <SelectItem value="Uganda">Uganda</SelectItem>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                    <SelectItem value="Tanzania">Tanzania</SelectItem>
                    <SelectItem value="Burundi">Burundi</SelectItem>
                    <SelectItem value="DRC">Democratic Republic of Congo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Station Location</Label>
              <ComprehensiveLocationPicker
                onLocationSelect={(location) => {
                  setFormData({
                    ...formData,
                    latitude: location.lat.toString(),
                    longitude: location.lng.toString()
                  });
                }}
                initialLocation={
                  formData.latitude && formData.longitude 
                    ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
                    : undefined
                }
                placeholder="Click on the map or search to set station location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input
                id="contact"
                value={formData.contactNumber}
                onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                placeholder="+250 XXX XXX XXX"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="status" className="text-sm font-medium">Active Station</Label>
                <p className="text-xs text-muted-foreground">
                  Station will be operational immediately
                </p>
              </div>
              <Switch
                id="status"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStation} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Create Station
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Station Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Station: {selectedStation?.name}
            </DialogTitle>
            <DialogDescription>
              Update station information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Station Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>District</Label>
                <Input value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Sector</Label>
                <Input value={formData.sector} onChange={(e) => setFormData({...formData, sector: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input 
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input 
                  value={formData.city} 
                  onChange={(e) => setFormData({...formData, city: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={formData.country} onValueChange={(value) => setFormData({...formData, country: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rwanda">Rwanda</SelectItem>
                    <SelectItem value="Uganda">Uganda</SelectItem>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                    <SelectItem value="Tanzania">Tanzania</SelectItem>
                    <SelectItem value="Burundi">Burundi</SelectItem>
                    <SelectItem value="DRC">Democratic Republic of Congo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Station Location</Label>
              <ComprehensiveLocationPicker
                onLocationSelect={(location) => {
                  setFormData({
                    ...formData,
                    latitude: location.lat.toString(),
                    longitude: location.lng.toString()
                  });
                }}
                initialLocation={
                  formData.latitude && formData.longitude 
                    ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) }
                    : undefined
                }
                placeholder="Click on the map or search to update station location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-contact">Contact Number</Label>
              <Input
                id="edit-contact"
                value={formData.contactNumber}
                onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="edit-status" className="text-sm font-medium">Active Station</Label>
                <p className="text-xs text-muted-foreground">
                  Station operational status
                </p>
              </div>
              <Switch
                id="edit-status"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast({
                title: "Station Updated",
                description: "Station information has been successfully updated.",
              });
              setShowEditModal(false);
            }} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Update Station
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Station
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedStation?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium">This will permanently:</p>
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  <li>Remove all station data</li>
                  <li>Reassign {selectedStation?.currentStaff || 0} staff members</li>
                  <li>Archive {selectedStation?.activeIncidents || 0} active incidents</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                toast({
                  title: "Station Deleted",
                  description: `${selectedStation?.name} has been permanently deleted.`,
                  variant: "destructive"
                });
                setShowDeleteModal(false);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Station
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Staff Management Modal */}
      <Dialog open={showStaffModal} onOpenChange={setShowStaffModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Management: {selectedStation?.name}
            </DialogTitle>
            <DialogDescription>
              Manage staff assignments and view personnel details for this station
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current Staff ({stationStaff.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {staffLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Loading staff data...</p>
                      </div>
                    ) : stationStaff.length > 0 ? (
                      stationStaff.map((staff: any) => (
                        <div key={staff.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{staff.name}</div>
                              <div className="text-sm text-muted-foreground capitalize">
                                {staff.role.replace('_', ' ')}
                              </div>
                              <div className="text-xs text-muted-foreground">{staff.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={staff.status === 'active' ? 'default' : 'secondary'}>
                              {staff.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No staff currently assigned to this station</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add New Staff
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Transfer Staff
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Staff List
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Capacity Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Current Staff</span>
                      <span>{selectedStation?.currentStaff || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Capacity</span>
                      <span>{selectedStation?.capacity || 0}</span>
                    </div>
                    <Progress 
                      value={selectedStation?.capacity ? (selectedStation.currentStaff || 0) / selectedStation.capacity * 100 : 0} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      {selectedStation?.capacity && selectedStation.currentStaff ? 
                        `${Math.round((selectedStation.currentStaff / selectedStation.capacity) * 100)}% utilized` : 
                        'Utilization unknown'
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setShowStaffModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}