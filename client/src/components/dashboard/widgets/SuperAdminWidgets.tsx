import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  MapPin, 
  Users, 
  AlertTriangle, 
  Clock,
  CheckCircle,
  UserPlus,
  Building,
  TrendingUp,
  Loader2,
  Play,
  Edit3,
  MessageSquare,
  ArrowUp,
  Zap,
  Bell,
  UserCheck,
  Eye,
  Edit,
  Shield,
  Settings,
  Activity
} from 'lucide-react';
import { getIncidentStats, getStations, getUsers, getIncidents, assignIncident, updateIncident } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Link } from 'wouter';
import { useState } from 'react';
import { Incident } from '@/types';

// Organization-wide Assignment Modal Component
const OrgAssignmentModal = ({ 
  isOpen, 
  onClose, 
  incident, 
  users,
  onAssign 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  incident: Incident | null;
  users: any[];
  onAssign: (assignmentData: { assignedToId: string; priority?: string; notes: string }) => void;
}) => {
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!assignedToId) return;
    onAssign({ 
      assignedToId,
      priority: priority || undefined,
      notes: notes.trim()
    });
    setAssignedToId("");
    setPriority("");
    setNotes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Super Admin Assignment
          </DialogTitle>
          <DialogDescription>
            Assign case organization-wide: {incident?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="staff" className="text-sm font-medium text-red-600">
              Select Staff Member *
            </Label>
            <Select value={assignedToId} onValueChange={setAssignedToId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose from organization..." />
              </SelectTrigger>
              <SelectContent>
                {users.filter((u: any) => u.role === 'station_staff' || u.role === 'station_admin').map((staff: any) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.firstName} {staff.lastName} - {staff.role.replace('_', ' ')} ({staff.stationName || 'No Station'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="priority" className="text-sm font-medium">
              Priority Level
            </Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Keep current priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="critical">Critical Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Super Admin Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Add administrative instructions or context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!assignedToId}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Shield className="h-4 w-4 mr-2" />
            Assign Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Super Admin Resolution Modal Component
const SuperAdminResolutionModal = ({ 
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
            Super Admin Resolution
          </DialogTitle>
          <DialogDescription>
            Administrative resolution: {incident?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="resolution" className="text-sm font-medium text-red-600">
              Resolution Summary *
            </Label>
            <Textarea
              id="resolution"
              placeholder="Describe how this incident was resolved administratively..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Super Admin Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Administrative notes, policy implications, or follow-up actions..."
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
            Resolve Case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const SuperAdminWidgets = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getIncidentStats,
    refetchInterval: 15000, // Optimized: Refresh every 15 seconds for better performance
    refetchOnWindowFocus: true,
    staleTime: 10000, // Consider data fresh for 10 seconds
  });

  const { data: stations, isLoading: stationsLoading, error: stationsError } = useQuery({
    queryKey: ['/api/stations'],
    queryFn: () => getStations(user?.organisationId),
    enabled: !!user?.organisationId,
    refetchInterval: 25000, // Optimized: Refresh every 25 seconds for station status
    staleTime: 20000, // Consider data fresh for 20 seconds
  });

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/users'],
    queryFn: getUsers,
    refetchInterval: 20000, // Optimized: Refresh every 20 seconds for user status
    staleTime: 15000, // Consider data fresh for 15 seconds
  });

  const { data: incidents, isLoading: incidentsLoading, error: incidentsError } = useQuery({
    queryKey: ['/api/incidents'],
    queryFn: getIncidents,
    refetchInterval: 12000, // Optimized: Refresh every 12 seconds for incident monitoring
    refetchOnWindowFocus: true,
    staleTime: 8000, // Consider data fresh for 8 seconds
  });

  // Mutations for case actions
  const assignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => assignIncident(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Success",
        description: "Case assigned successfully",
      });
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
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Success",
        description: "Case updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Show loading state
  if (statsLoading || stationsLoading || usersLoading || incidentsLoading) {
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
  if (statsError || stationsError || usersError || incidentsError) {
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
              {stationsError && <p className="text-red-600">• Failed to load stations</p>}
              {usersError && <p className="text-red-600">• Failed to load users</p>}
              {incidentsError && <p className="text-red-600">• Failed to load incidents</p>}
              <p className="text-gray-600 mt-4">Please refresh the page or contact support if the issue persists.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate real data metrics
  const organizationUsers = users?.filter((u: any) => u.organisationId === user?.organisationId) || [];
  const stationAdmins = organizationUsers.filter((u: any) => u.role === 'station_admin');
  const stationStaff = organizationUsers.filter((u: any) => u.role === 'station_staff');
  const totalStations = stations?.length || 0;
  const activeStations = stations?.filter((s: any) => s.isActive !== false).length || totalStations;

  // Get organization incidents and actions
  const organizationIncidents = incidents?.filter((incident: any) => 
    organizationUsers.some((user: any) => user.id === incident.assignedToId) ||
    incident.organizationId === user?.organisationId
  ) || [];

  const criticalOrgIncidents = organizationIncidents.filter((incident: any) => 
    incident.priority === 'critical' || incident.priority === 'high'
  ).slice(0, 4);

  const unassignedOrgIncidents = organizationIncidents.filter((incident: any) => 
    !incident.assignedToId && incident.status === 'reported'
  ).slice(0, 3);

  const escalatedIncidents = organizationIncidents.filter((incident: any) => 
    incident.status === 'escalated'
  ).slice(0, 3);

  // Action handlers
  const handleTakeCase = (incident: Incident) => {
    const currentUserId = user?.userId || user?.id;
    assignMutation.mutate({
      id: incident.id,
      data: { assignedToId: currentUserId }
    });
  };

  const handleAssignStaff = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowAssignModal(true);
  };

  const handleQuickResolve = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowResolutionModal(true);
  };

  const handleEscalate = (incident: Incident) => {
    updateMutation.mutate({
      id: incident.id,
      data: { status: 'escalated' }
    });
  };

  const handleAssignmentSubmit = (assignmentData: { assignedToId: string; priority?: string; notes: string }) => {
    if (!selectedIncident) return;
    
    assignMutation.mutate({
      id: selectedIncident.id,
      data: assignmentData
    });
    
    setShowAssignModal(false);
    setSelectedIncident(null);
  };

  const handleResolutionSubmit = (resolutionData: { resolution: string; notes: string }) => {
    if (!selectedIncident) return;
    
    const currentUserId = user?.userId || user?.id;
    updateMutation.mutate({
      id: selectedIncident.id,
      data: { 
        status: 'resolved',
        resolution: resolutionData.resolution,
        notes: resolutionData.notes,
        resolvedBy: currentUserId,
        resolvedAt: new Date().toISOString()
      }
    });
    
    setShowResolutionModal(false);
    setSelectedIncident(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Organization Overview */}
        <Card className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Building className="h-5 w-5 text-primary" />
              Organization Overview
              <Badge variant="outline" className="ml-auto">Live</Badge>
            </CardTitle>
            <CardDescription>
              Your organization's current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                <span className="text-sm font-medium text-foreground">Total Stations</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{totalStations}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                <span className="text-sm font-medium text-foreground">Active Stations</span> 
                <span className="font-bold text-green-600 dark:text-green-400">{activeStations}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium text-foreground">Total Staff</span>
                <span className="font-bold text-foreground">{organizationUsers.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
                <span className="text-sm font-medium text-foreground">Org Cases</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{organizationIncidents.length}</span>
              </div>
              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-foreground font-medium">Station Coverage</span>
                  <span className="text-foreground font-bold">{totalStations > 0 ? Math.round((activeStations / totalStations) * 100) : 0}%</span>
                </div>
                <Progress value={totalStations > 0 ? (activeStations / totalStations) * 100 : 0} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Organization-wide Cases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical Cases
              <Badge variant="destructive" className="ml-auto text-xs">
                {criticalOrgIncidents.length} Critical
              </Badge>
            </CardTitle>
            <CardDescription>
              Organization-wide critical cases requiring super admin attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalOrgIncidents.length > 0 ? (
                criticalOrgIncidents.map((incident: any) => (
                  <div key={incident.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{incident.title}</p>
                        <p className="text-xs text-gray-600 truncate">{incident.description}</p>
                      </div>
                      <Badge 
                        variant="destructive"
                        className="text-xs ml-2"
                      >
                        {incident.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {!incident.assignedToId && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleTakeCase(incident)}
                            className="bg-red-600 hover:bg-red-700 text-white h-6 px-2 text-xs"
                            disabled={assignMutation.isPending}
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            Take
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAssignStaff(incident)}
                            className="bg-blue-600 hover:bg-blue-700 text-white h-6 px-2 text-xs"
                            disabled={assignMutation.isPending}
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            Assign
                          </Button>
                        </>
                      )}
                      
                      {incident.assignedToId && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleQuickResolve(incident)}
                            className="bg-green-600 hover:bg-green-700 text-white h-6 px-2 text-xs"
                            disabled={updateMutation.isPending}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEscalate(incident)}
                            className="h-6 px-2 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                            disabled={updateMutation.isPending}
                          >
                            <ArrowUp className="w-3 h-3 mr-1" />
                            Escalate
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No critical cases</p>
                  <p className="text-xs">Organization is running smoothly</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Escalated Cases Requiring Super Admin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUp className="h-5 w-5" />
              Escalated Cases
              <Badge variant="outline" className="ml-auto text-xs text-orange-600">
                {escalatedIncidents.length} Escalated
              </Badge>
            </CardTitle>
            <CardDescription>
              Cases escalated to super admin level for resolution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {escalatedIncidents.length > 0 ? (
                escalatedIncidents.map((incident: any) => (
                  <div key={incident.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{incident.title}</p>
                        <p className="text-xs text-gray-600 truncate">{incident.description}</p>
                      </div>
                      <Badge 
                        variant="outline"
                        className="text-xs ml-2 border-orange-300 text-orange-600"
                      >
                        Escalated
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => handleTakeCase(incident)}
                        className="bg-orange-600 hover:bg-orange-700 text-white h-6 px-2 text-xs"
                        disabled={assignMutation.isPending}
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        Take Control
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleQuickResolve(incident)}
                        className="bg-green-600 hover:bg-green-700 text-white h-6 px-2 text-xs"
                        disabled={updateMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAssignStaff(incident)}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-6 px-2 text-xs"
                        disabled={assignMutation.isPending}
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        Reassign
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No escalated cases</p>
                  <p className="text-xs">All cases handled at station level</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Staff Management with Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Management
            </CardTitle>
            <CardDescription>
              Manage your organization's staff
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Station Admins</span>
                <Badge variant="secondary">{stationAdmins.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Station Staff</span>
                <Badge variant="secondary">{stationStaff.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Members</span>
                <Badge variant="outline">{organizationUsers.length}</Badge>
              </div>
              <div className="pt-2">
                <Link href="/users">
                  <Button size="sm" className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Manage Staff ({organizationUsers.length})
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unassigned Organization Cases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Unassigned Cases
              <Badge variant="outline" className="ml-auto text-xs">
                {unassignedOrgIncidents.length} Pending
              </Badge>
            </CardTitle>
            <CardDescription>
              Organization-wide unassigned cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unassignedOrgIncidents.length > 0 ? (
                unassignedOrgIncidents.map((incident: any) => (
                  <div key={incident.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{incident.title}</p>
                        <p className="text-xs text-gray-600 truncate">{incident.description}</p>
                      </div>
                      <Badge 
                        variant={
                          incident.priority === 'critical' || incident.priority === 'high' 
                            ? "destructive" 
                            : incident.priority === 'medium' 
                            ? "default" 
                            : "secondary"
                        }
                        className="text-xs ml-2"
                      >
                        {incident.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => handleTakeCase(incident)}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-6 px-2 text-xs"
                        disabled={assignMutation.isPending}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Take Case
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAssignStaff(incident)}
                        className="bg-purple-600 hover:bg-purple-700 text-white h-6 px-2 text-xs"
                        disabled={assignMutation.isPending}
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        Assign
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">All cases assigned</p>
                  <p className="text-xs">Excellent organization management!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Station Performance with Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Station Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stations && stations.length > 0 ? (
                stations.slice(0, 3).map((station: any) => (
                  <div key={station.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{station.name}</p>
                      <p className="text-xs text-gray-500">{station.address || station.region || 'No location'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={station.isActive !== false ? "secondary" : "outline"}>
                        {station.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No stations found</p>
                  <p className="text-xs">Create your first station to get started</p>
                </div>
              )}
              {stations && stations.length > 3 && (
                <div className="pt-2">
                  <Link href="/stations">
                    <Button variant="outline" size="sm" className="w-full">
                      View All {stations.length} Stations
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Organization Activity Overview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Organization Activity
              <Badge variant="outline" className="ml-auto text-xs">Live</Badge>
            </CardTitle>
            <CardDescription>
              Monitor organization-wide activity and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-blue-600">{organizationIncidents.length}</div>
                <p className="text-sm text-gray-600">Total Cases</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-yellow-600">{unassignedOrgIncidents.length}</div>
                <p className="text-sm text-gray-600">Unassigned</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-green-600">{stats?.resolved || 0}</div>
                <p className="text-sm text-gray-600">Resolved</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-purple-600">{organizationUsers.length}</div>
                <p className="text-sm text-gray-600">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Super Admin Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Super Admin Actions
            </CardTitle>
            <CardDescription>
              Administrative tasks and management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/stations">
                <Button variant="outline" className="w-full justify-start">
                  <MapPin className="h-4 w-4 mr-2" />
                  Manage Stations ({totalStations})
                </Button>
              </Link>
              <Link href="/users">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Staff ({organizationUsers.length})
                </Button>
              </Link>
              <Link href="/incidents">
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  All Incidents ({organizationIncidents.length})
                </Button>
              </Link>
              <Link href="/invitations">
                <Button variant="outline" className="w-full justify-start">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitations
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <OrgAssignmentModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedIncident(null);
        }}
        incident={selectedIncident}
        users={organizationUsers}
        onAssign={handleAssignmentSubmit}
      />

      <SuperAdminResolutionModal
        isOpen={showResolutionModal}
        onClose={() => {
          setShowResolutionModal(false);
          setSelectedIncident(null);
        }}
        incident={selectedIncident}
        onResolve={handleResolutionSubmit}
      />
    </>
  );
};