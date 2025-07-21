import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Eye, UserPlus, Edit, Play, CheckCircle, AlertTriangle } from "lucide-react";
import { getIncidents, assignIncident, updateIncident } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AssignmentModal } from "./AssignmentModal";
import { IncidentDetailModal } from "./IncidentDetailModal";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Incident } from "@/types";
import { cn } from "@/lib/utils";

export const IncidentTable = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const { data: incidents, isLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    queryFn: getIncidents,
    enabled: !authLoading && !!user, // Only run query when user is authenticated
    onSuccess: (data) => {
      console.log('=== DEBUGGING INCIDENTS DATA ===');
      console.log('User:', user);
      console.log('User role:', user?.role);
      console.log('User station ID:', user?.stationId);
      console.log('User ID:', user?.userId);
      console.log('Incidents data:', data);
      if (data && data.length > 0) {
        console.log('First incident:', data[0]);
        console.log('First incident keys:', Object.keys(data[0]));
        console.log('Incident station IDs:', data.map(i => i.stationId));
      }
      console.log('=== END DEBUGGING ===');
    }
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => assignIncident(id, data),
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
    mutationFn: ({ id, data }: { id: number; data: any }) => updateIncident(id, data),
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

  // Filter all station incidents (based on user's role)
  const allStationIncidents = incidents?.filter((incident) => {
    const matchesSearch = (incident.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (incident.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    
    // Role-based filtering for station incidents
    if (user?.role === 'station_staff' || user?.role === 'station_admin') {
      const stationMatches = incident.stationId === user.stationId;
      console.log(`Filtering incident ${incident.id}: stationId=${incident.stationId}, userStationId=${user.stationId}, matches=${stationMatches}`);
      return matchesSearch && matchesStatus && stationMatches;
    } else if (user?.role === 'super_admin') {
      return matchesSearch && matchesStatus && incident.organizationId === user.organizationId;
    }
    
    return matchesSearch && matchesStatus;
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
    updateMutation.mutate({
      id: incident.id,
      data: { status: 'resolved' }
    });
    toast({
      title: "Success",
      description: "Incident marked as resolved",
    });
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
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      assigned: "bg-blue-100 text-blue-800 border-blue-300",
      in_progress: "bg-orange-100 text-orange-800 border-orange-300",
      resolved: "bg-green-100 text-green-800 border-green-300",
      escalated: "bg-red-100 text-red-800 border-red-300",
    };
    
    const safeStatus = status || "pending";
    
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

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
    }
  };

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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {user?.role === 'station_staff' ? 'Station Incident Management' : 'Recent Incidents'}
            </CardTitle>
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search incidents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              {/* Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
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
    </>
  );

  // Table content component to avoid duplication
  function IncidentTableContent({ incidents }: { incidents: Incident[] }) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
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
            <TableRow key={incident.id} className="hover:bg-gray-50">
              <TableCell>
                <div className="text-sm font-medium text-gray-900">
                  #INC-{(incident.id || 0).toString().padStart(4, '0')}
                </div>
                <div className="text-sm text-gray-500">
                  {formatTimeAgo(incident.createdAt || '')}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium text-gray-900">
                  {incident.title || 'Untitled Incident'}
                </div>
                <div className="text-sm text-gray-500 truncate max-w-xs">
                  {incident.description || 'No description available'}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-900">
                  {incident.locationAddress || 'Unknown'}
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(incident.status || 'pending')}
              </TableCell>
              <TableCell>
                {incident.assignedToId ? (
                  <div className="text-sm text-gray-900">
                    {incident.assignedToName || 'Assigned'}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Unassigned</div>
                )}
              </TableCell>
              <TableCell>
                {getPriorityBadge(incident.priority || 'medium')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {/* Station Staff dropdown workflow */}
                  {user?.role === 'station_staff' && (
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
                        
                        {/* Pending - not assigned to anyone */}
                        {incident.status === 'pending' && !incident.assignedToId && (
                          <SelectItem value="self_assign">
                            <div className="flex items-center gap-2">
                              <UserPlus className="w-3 h-3 text-blue-600" />
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
                              <UserPlus className="w-3 h-3 text-blue-600" />
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
                  
                  {/* View button for other roles */}
                  {user?.role !== 'station_admin' && (
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