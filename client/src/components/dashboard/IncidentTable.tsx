import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Eye, UserPlus, Edit, Play, CheckCircle, AlertTriangle, Clock, User } from "lucide-react";
import { getIncidents, assignIncident, updateIncident } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AssignmentModal } from "./AssignmentModal";
import { IncidentDetailModal } from "./IncidentDetailModal";
import { BulkOperationsBar } from "./BulkOperationsBar";
import { AdvancedSearch } from "../search/AdvancedSearch";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Incident } from "@/types";
import { cn } from "@/lib/utils";
import { formatSmart, formatForDisplay } from "../../utils/dateUtils";

// Quick Resolution Modal Component
const QuickResolutionModal = ({ 
  isOpen, 
  onClose, 
  incident, 
  onResolve 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  incident: Incident | null; 
  onResolve: (resolutionData: { resolution: string; notes: string }) => void;
}) => {
  const [resolution, setResolution] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!resolution.trim()) return;
    onResolve({ resolution: resolution.trim(), notes: notes.trim() });
    setResolution("");
    setNotes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Mark Case Resolved
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Incident</Label>
            <div className="mt-1 text-sm text-gray-600">
              {incident?.title}
            </div>
          </div>
          <div>
            <Label htmlFor="resolution" className="text-sm font-medium text-red-600">
              Resolution Summary *
            </Label>
            <Textarea
              id="resolution"
              placeholder="Describe how this incident was resolved..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes or follow-up actions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!resolution.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Resolved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const IncidentTable = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // Multi-select state
  const [selectedIncidents, setSelectedIncidents] = useState<Incident[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // Advanced search state
  const [searchFilters, setSearchFilters] = useState<Record<string, any>>({});

  const { data: incidents, isLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    queryFn: getIncidents,
    enabled: !authLoading && !!user, // Only run query when user is authenticated
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assignIncident(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Incident assigned successfully",
      });
      setShowAssignModal(false);
      setSelectedIncident(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateIncident(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Multi-select handlers
  const handleIncidentSelect = (incident: Incident, checked: boolean) => {
    if (checked) {
      setSelectedIncidents(prev => [...prev, incident]);
    } else {
      setSelectedIncidents(prev => prev.filter(i => i.id !== incident.id));
    }
  };

  const handleSelectAll = () => {
    setSelectedIncidents([...allStationIncidents]);
  };

  const handleClearSelection = () => {
    setSelectedIncidents([]);
    setIsSelectMode(false);
  };

  const isIncidentSelected = (incidentId: string) => {
    return selectedIncidents.some(incident => incident.id === incidentId);
  };

  // Advanced search handler
  const handleAdvancedSearch = (filters: Record<string, any>) => {
    setSearchFilters(filters);
  };

  // Bulk operations handler
  const handleBulkAction = async (action: string, data?: any) => {
    const incidentIds = selectedIncidents.map(incident => incident.id);
    
    try {
      const response = await fetch('/api/incidents/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action,
          incidentIds,
          data: {
            ...data,
            userId: user?.userId
          }
        })
      });

      if (!response.ok) {
        throw new Error('Bulk operation failed');
      }

      // Refresh incidents data
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });

      // Handle export action differently
      if (action === 'export') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `incidents-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

    } catch (error) {
      console.error('Bulk operation error:', error);
      throw error;
    }
  };

  // Advanced filtering with all search criteria
  const allStationIncidents = incidents?.filter((incident) => {
    // Advanced search filters
    if (searchFilters.search) {
      const searchTerm = searchFilters.search.toLowerCase();
      const matchesSearch = (incident.title || "").toLowerCase().includes(searchTerm) ||
                           (incident.description || "").toLowerCase().includes(searchTerm) ||
                           (incident.location?.address || "").toLowerCase().includes(searchTerm) ||
                           (incident.notes || "").toLowerCase().includes(searchTerm);
      if (!matchesSearch) return false;
    }

    // Status filter (multiselect)
    if (searchFilters.status && searchFilters.status.length > 0) {
      if (!searchFilters.status.includes(incident.status)) return false;
    }

    // Priority filter (multiselect)
    if (searchFilters.priority && searchFilters.priority.length > 0) {
      if (!searchFilters.priority.includes(incident.priority)) return false;
    }

    // Type filter (multiselect)
    if (searchFilters.type && searchFilters.type.length > 0) {
      if (!searchFilters.type.includes(incident.type)) return false;
    }

    // Assignment filter
    if (searchFilters.assignedTo) {
      const currentUserId = user?.userId || user?.id;
      switch (searchFilters.assignedTo) {
        case 'me':
          if (incident.assignedToId !== currentUserId) return false;
          break;
        case 'unassigned':
          if (incident.assignedToId) return false;
          break;
        case 'anyone':
          // No filter needed
          break;
      }
    }

    // Location filter
    if (searchFilters.location) {
      const locationTerm = searchFilters.location.toLowerCase();
      const matchesLocation = (incident.location?.address || "").toLowerCase().includes(locationTerm);
      if (!matchesLocation) return false;
    }

    // Incident ID filter
    if (searchFilters.incidentId) {
      const idMatch = incident.id?.toString().includes(searchFilters.incidentId) ||
                     `INC-${(incident.id || 0).toString().padStart(4, '0')}`.includes(searchFilters.incidentId.toUpperCase());
      if (!idMatch) return false;
    }

    // Date range filter
    if (searchFilters.dateRange) {
      const incidentDate = new Date(incident.createdAt || '');
      const now = new Date();
      
      switch (searchFilters.dateRange) {
        case 'today':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (incidentDate < today) return false;
          break;
        case 'yesterday':
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          const yesterdayEnd = new Date(yesterday);
          yesterdayEnd.setHours(23, 59, 59, 999);
          if (incidentDate < yesterday || incidentDate > yesterdayEnd) return false;
          break;
        case 'week':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (incidentDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (incidentDate < monthAgo) return false;
          break;
      }
    }

    // Legacy simple filters (fallback for existing UI)
    if (searchTerm && !searchFilters.search) {
      const matchesLegacySearch = (incident.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (incident.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesLegacySearch) return false;
    }

    if (statusFilter !== "all" && !searchFilters.status) {
      if (incident.status !== statusFilter) return false;
    }
    
    // Role-based filtering for station incidents
    if (user?.role === 'station_staff' || user?.role === 'station_admin') {
      const stationMatches = incident.stationId === user.stationId;
      console.log(`Filtering incident ${incident.id}: stationId=${incident.stationId}, userStationId=${user.stationId}, matches=${stationMatches}`);
      return stationMatches;
    } else if (user?.role === 'super_admin') {
      return incident.organisationId === user.organisationId;
    }
    
    return true;
  }) || [];

  console.log('=== FILTERING RESULTS ===');
  console.log('All incidents:', incidents?.length || 0);
  console.log('All station incidents:', allStationIncidents.length);
  console.log('User role:', user?.role);
  console.log('User station ID:', user?.stationId);

  // Filter incidents assigned to current user
  const myAssignedIncidents = allStationIncidents?.filter(incident => {
    const currentUserId = user?.userId || user?.id;
    const isAssigned = incident.assignedToId === currentUserId;
    console.log(`Incident ${incident.id} assigned check: assignedToId=${incident.assignedToId}, userId=${currentUserId}, isAssigned=${isAssigned}`);
    return isAssigned;
  }) || [];

  console.log('My assigned incidents:', myAssignedIncidents.length);
  console.log('=== END FILTERING RESULTS ===');

  // Choose which incidents to display based on active tab
  const filteredIncidents = activeTab === "assigned" ? myAssignedIncidents : allStationIncidents;

  const handleAssignIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowAssignModal(true);
  };

  const handleViewIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowDetailModal(true);
  };

  const handleEditIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowDetailModal(true);
  };

  const handleAssignSubmit = (assignmentData: any) => {
    if (selectedIncident) {
      assignMutation.mutate({
        id: selectedIncident.id,
        data: assignmentData,
      });
    }
  };

  const handleSelfAssign = (incident: Incident) => {
    const currentUserId = user?.userId || user?.id;
    console.log('Self-assign attempt:', { incidentId: incident.id, userId: currentUserId });
    if (currentUserId) {
      assignMutation.mutate({
        id: incident.id,
        data: { assignedToId: currentUserId },
      });
      toast({
        title: "Success",
        description: "Successfully assigned case to yourself",
      });
    }
  };

  const handleStartWork = (incident: Incident) => {
    updateMutation.mutate({
      id: incident.id,
      data: { status: 'in_progress' }
    });
    toast({
      title: "Success",
      description: "Started working on incident",
    });
  };

  const handleQuickResolve = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowResolutionModal(true);
  };

  const handleResolutionSubmit = (resolutionData: { resolution: string; notes: string }) => {
    if (!selectedIncident) return;
    
    updateMutation.mutate({
      id: selectedIncident.id,
      data: { 
        status: 'resolved',
        resolution: resolutionData.resolution,
        notes: resolutionData.notes,
        resolvedBy: user?.userId || user?.id,
        resolvedAt: new Date().toISOString()
      }
    });
    
    toast({
      title: "Success",
      description: "Incident marked as resolved",
    });
    
    setShowResolutionModal(false);
    setSelectedIncident(null);
  };

  const handleWorkflowChange = (incident: Incident, value: string) => {
    switch (value) {
      case 'self_assign':
        handleSelfAssign(incident);
        break;
      case 'start_work':
        handleStartWork(incident);
        break;
      case 'resolve':
        handleQuickResolve(incident);
        break;
      case 'escalate':
        updateMutation.mutate({
          id: incident.id,
          data: { status: 'escalated' }
        });
        toast({
          title: "Success",
          description: "Incident escalated for additional support",
        });
        break;
      case 'assign_staff':
        handleAssignIncident(incident);
        break;
      case 'view_details':
        handleViewIncident(incident);
        break;
      case 'edit_incident':
        handleEditIncident(incident);
        break;
      default:
        break;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      reported: "bg-blue-100 text-blue-800 border-blue-300",
      assigned: "bg-purple-100 text-purple-800 border-purple-300",
      in_progress: "bg-orange-100 text-orange-800 border-orange-300",
      resolved: "bg-green-100 text-green-800 border-green-300",
      escalated: "bg-red-100 text-red-800 border-red-300",
    };
    
    const safeStatus = status || "reported";
    
    return (
      <Badge className={cn("border", statusClasses[safeStatus as keyof typeof statusClasses])}>
        {safeStatus.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityClasses = {
      low: "bg-gray-100 text-gray-800 border-gray-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      critical: "bg-red-100 text-red-800 border-red-300",
    };
    
    const safePriority = priority || "medium";
    
    return (
      <Badge className={cn("border", priorityClasses[safePriority as keyof typeof priorityClasses])}>
        {safePriority}
      </Badge>
    );
  };

  // Remove custom formatTimeAgo - using shared date utilities instead

  // Handle loading states
  if (authLoading || isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle no user case
  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Please log in to view incidents</div>
        </CardContent>
      </Card>
    );
  }



  return (
    <>
      {/* Bulk Operations Bar */}
      <BulkOperationsBar
        selectedIncidents={selectedIncidents}
        allIncidents={allStationIncidents}
        onClearSelection={handleClearSelection}
        onBulkAction={handleBulkAction}
        onSelectAll={handleSelectAll}
      />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {user?.role === 'station_staff' ? 'Station Incident Management' : 'Recent Incidents'}
            </CardTitle>
            <div className="flex items-center space-x-3">
              {/* Legacy search fallback for compatibility - will be hidden when advanced search is active */}
              {Object.keys(searchFilters).length === 0 && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search incidents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        
        {/* Advanced Search */}
        <div className="px-6 pb-4">
          <AdvancedSearch
            onSearch={handleAdvancedSearch}
            initialFilters={searchFilters}
            placeholder="Search incidents, descriptions, locations..."
            showSavedSearches={true}
            showGlobalSearch={true}
          />
        </div>
        
        <CardContent>

          
          {/* Two-Tab System for Station Staff and Station Admin */}
          {(user?.role === 'station_staff' || user?.role === 'station_admin') ? (
            <div className="space-y-4">

              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="all">
                    All Station Incidents ({allStationIncidents.length})
                  </TabsTrigger>
                  <TabsTrigger value="assigned">
                    Incidents ({myAssignedIncidents.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="space-y-4">
                  <IncidentTableContent incidents={allStationIncidents} />
                </TabsContent>
                
                <TabsContent value="assigned" className="space-y-4">
                  <IncidentTableContent incidents={myAssignedIncidents} />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <IncidentTableContent incidents={filteredIncidents} />
          )}
        </CardContent>
      </Card>
      
      {/* Modals */}
      {showAssignModal && selectedIncident && (
        <AssignmentModal
          incident={selectedIncident}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedIncident(null);
          }}
          onSubmit={handleAssignSubmit}
        />
      )}
      
      {showDetailModal && selectedIncident && (
        <IncidentDetailModal
          isOpen={showDetailModal}
          incident={selectedIncident}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedIncident(null);
          }}
        />
      )}

      {showResolutionModal && selectedIncident && (
        <Dialog open={showResolutionModal} onOpenChange={setShowResolutionModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Incident</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="resolution">Resolution Details</Label>
                <Textarea
                  id="resolution"
                  placeholder="Describe how the incident was resolved..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes..."
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowResolutionModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const resolution = (document.getElementById('resolution') as HTMLTextAreaElement)?.value;
                  const notes = (document.getElementById('notes') as HTMLTextAreaElement)?.value;
                  handleResolutionSubmit({ resolution, notes });
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Mark as Resolved
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );

  // Table content component to avoid duplication
  function IncidentTableContent({ incidents }: { incidents: Incident[] }) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={selectedIncidents.length === incidents.length && incidents.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedIncidents([...incidents]);
                    setIsSelectMode(true);
                  } else {
                    setSelectedIncidents([]);
                  }
                }}
              />
            </TableHead>
            <TableHead>Incident ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {incidents.map((incident) => (
            <TableRow 
              key={incident.id} 
              className={cn(
                "hover:bg-gray-50",
                isIncidentSelected(incident.id) && "bg-blue-50 border-blue-200"
              )}
            >
              <TableCell>
                <Checkbox
                  checked={isIncidentSelected(incident.id)}
                  onCheckedChange={(checked) => {
                    handleIncidentSelect(incident, checked as boolean);
                    if (checked) setIsSelectMode(true);
                  }}
                />
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium text-gray-900">
                  #INC-{(incident.id || 0).toString().padStart(4, '0')}
                </div>
                <div className="text-sm text-gray-500">
                  {formatSmart(incident.createdAt || '')}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium text-gray-900">
                  {incident.title || 'Untitled Incident'}
                </div>
                <div className="text-sm text-gray-500 truncate max-w-xs">
                  {incident.description || 'No description available'}
                </div>
                {incident.location?.address && (
                  <div className="text-xs text-gray-500 mt-1">
                    📍 {incident.location.address}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-900">
                  {incident.location?.address || 'Unknown'}
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(incident.status || 'pending')}
              </TableCell>
              <TableCell>
                {incident.assignedToId ? (
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      incident.assignedToId === (user?.userId || user?.id) 
                        ? "bg-green-500" 
                        : "bg-blue-500"
                    )}></div>
                    <div className="text-sm text-gray-900">
                      {incident.assignedToId === (user?.userId || user?.id) ? (
                        <span className="font-medium text-green-700">You</span>
                      ) : (
                        incident.assignedToName || 'Assigned User'
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    <div className="text-sm text-gray-500">Unassigned</div>
                  </div>
                )}
              </TableCell>
              <TableCell>
                {getPriorityBadge(incident.priority || 'medium')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {/* Enhanced Case Management - Prominent Action Buttons */}
                  {user?.role === 'station_staff' && (
                    <div className="flex items-center gap-2">
                      {/* Quick Action Buttons for Station Staff */}
                      {incident.status === 'reported' && !incident.assignedToId && (
                        <Button
                          size="sm"
                          onClick={() => handleSelfAssign(incident)}
                          className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 font-medium"
                          disabled={assignMutation.isPending}
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          Take Case
                        </Button>
                      )}
                      
                      {incident.status === 'assigned' && incident.assignedToId === (user?.userId || user?.id) && (
                        <Button
                          size="sm"
                          onClick={() => handleStartWork(incident)}
                          className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                          disabled={updateMutation.isPending}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Start Work
                        </Button>
                      )}
                      
                      {incident.status === 'in_progress' && incident.assignedToId === (user?.userId || user?.id) && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleQuickResolve(incident)}
                            className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                            disabled={updateMutation.isPending}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              updateMutation.mutate({
                                id: incident.id,
                                data: { status: 'escalated' }
                              });
                            }}
                            className="h-8 px-3 border-orange-300 text-orange-600 hover:bg-orange-50"
                            disabled={updateMutation.isPending}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Escalate
                          </Button>
                        </>
                      )}
                      
                      {/* Always show view button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewIncident(incident)}
                        className="h-8 px-2 text-gray-600 hover:text-gray-800"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Enhanced Case Management for Station Admin */}
                  {user?.role === 'station_admin' && (
                    <div className="flex items-center gap-2">
                      {/* Take Case Button for Admins */}
                      <Button
                        size="sm"
                        onClick={() => handleSelfAssign(incident)}
                        className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 font-medium"
                        disabled={assignMutation.isPending}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Take Case
                      </Button>
                      
                      {/* Assign to Staff Button */}
                      {!incident.assignedToId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssignIncident(incident)}
                          className="h-8 px-3 border-purple-300 text-purple-600 hover:bg-purple-50"
                        >
                          <User className="w-3 h-3 mr-1" />
                          Assign Staff
                        </Button>
                      )}
                      
                      {/* View and Edit Buttons */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewIncident(incident)}
                        className="h-8 px-2 text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditIncident(incident)}
                        className="h-8 px-2 text-green-600 hover:text-green-800"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Legacy dropdown for other cases */}
                  {user?.role === 'station_staff' && false && (
                    <div className="flex items-center gap-2">
                      <Select
                        value=""
                        onValueChange={(value) => {
                          console.log('Station staff action selected:', value, 'for incident:', incident.id);
                          handleWorkflowChange(incident, value);
                        }}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue placeholder="Actions" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Show current status first */}
                          <SelectItem value="current_status" disabled>
                            <div className="flex items-center gap-2 text-gray-500">
                              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                              Current: {incident.status?.replace('_', ' ') || 'pending'}
                            </div>
                          </SelectItem>
                        
                        {/* Reported - not assigned to anyone */}
                        {incident.status === 'reported' && !incident.assignedToId && (
                          <SelectItem value="self_assign">
                            <div className="flex items-center gap-2">
                              <UserPlus className="w-3 h-3 text-red-600" />
                              Take Case
                            </div>
                          </SelectItem>
                        )}
                        
                        {/* Assigned - assigned to current user */}
                        {incident.status === 'assigned' && incident.assignedToId === (user?.userId || user?.id) && (
                          <SelectItem value="start_work">
                            <div className="flex items-center gap-2">
                              <Play className="w-3 h-3 text-green-600" />
                              Start Working
                            </div>
                          </SelectItem>
                        )}
                        
                        {/* In Progress - assigned to current user */}
                        {incident.status === 'in_progress' && incident.assignedToId === (user?.userId || user?.id) && (
                          <>
                            <SelectItem value="resolve">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                Mark Resolved
                              </div>
                            </SelectItem>
                            <SelectItem value="escalate">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3 text-orange-600" />
                                Escalate
                              </div>
                            </SelectItem>
                          </>
                        )}
                        
                        {/* Always show view details */}
                        <SelectItem value="view_details">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3 h-3 text-blue-600" />
                            View Details
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    </div>
                  )}
                  
                  {/* Station Admin dropdown workflow */}
                  {user?.role === 'station_admin' && (
                    <div className="flex items-center gap-2">
                      <Select
                        value=""
                        onValueChange={(value) => {
                          console.log('Station admin action selected:', value, 'for incident:', incident.id);
                          handleWorkflowChange(incident, value);
                        }}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue placeholder="Actions" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Show current status first */}
                          <SelectItem value="current_status_admin" disabled>
                            <div className="flex items-center gap-2 text-gray-500">
                              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                              Current: {incident.status?.replace('_', ' ') || 'pending'}
                            </div>
                          </SelectItem>
                          
                          {/* Self-assign option for station admins - always available */}
                          <SelectItem value="self_assign">
                            <div className="flex items-center gap-2">
                              <UserPlus className="w-3 h-3 text-red-600" />
                              Take Case
                            </div>
                          </SelectItem>
                          
                          {/* Assign staff option for unassigned incidents */}
                          {!incident.assignedToId && (
                            <SelectItem value="assign_staff">
                              <div className="flex items-center gap-2">
                                <UserPlus className="w-3 h-3 text-red-600" />
                                Assign Staff
                              </div>
                            </SelectItem>
                          )}
                          
                          <SelectItem value="view_details">
                            <div className="flex items-center gap-2">
                              <Eye className="w-3 h-3 text-blue-600" />
                              View Details
                            </div>
                          </SelectItem>
                          
                          <SelectItem value="edit_incident">
                            <div className="flex items-center gap-2">
                              <Edit className="w-3 h-3 text-green-600" />
                              Edit Incident
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Super Admin Controls */}
                  {user?.role === 'super_admin' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSelfAssign(incident)}
                        className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 font-medium"
                        disabled={assignMutation.isPending}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Take Case
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewIncident(incident)}
                        className="h-8 px-2 text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditIncident(incident)}
                        className="h-8 px-2 text-green-600 hover:text-green-800"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  
                  {/* View button for other roles */}
                  {!['station_admin', 'station_staff', 'super_admin'].includes(user?.role || '') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewIncident(incident)}
                      className="text-blue-600 hover:text-blue-700"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
};