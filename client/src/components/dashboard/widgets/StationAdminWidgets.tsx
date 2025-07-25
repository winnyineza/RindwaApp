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
  AlertTriangle, 
  Users, 
  Clock,
  CheckCircle,
  UserPlus,
  Calendar,
  MapPin,
  Activity,
  TrendingUp,
  Shield,
  Loader2,
  Play,
  Edit3,
  MessageSquare,
  ArrowUp,
  Zap,
  Bell,
  UserCheck,
  Eye,
  Edit
} from 'lucide-react';
import { getIncidentStats, getUsers, getIncidents, assignIncident, updateIncident } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Link } from 'wouter';
import { useState } from 'react';
import { Incident } from '@/types';

// Staff Assignment Modal Component
const StaffAssignmentModal = ({ 
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
            <UserCheck className="h-5 w-5 text-purple-600" />
            Assign Staff to Case
          </DialogTitle>
          <DialogDescription>
            Assign case to staff member: {incident?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="staff" className="text-sm font-medium text-red-600">
              Select Staff Member *
            </Label>
            <Select value={assignedToId} onValueChange={setAssignedToId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose staff member..." />
              </SelectTrigger>
              <SelectContent>
                {users.filter((u: any) => u.role === 'station_staff').map((staff: any) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.firstName} {staff.lastName} - {staff.role.replace('_', ' ')}
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
              Assignment Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any instructions or context for the assigned staff..."
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
            className="bg-purple-600 hover:bg-purple-700"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Assign Staff
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Quick Resolution Modal Component
const AdminResolutionModal = ({ 
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
            Admin Resolution
          </DialogTitle>
          <DialogDescription>
            Resolve case as admin: {incident?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
              Admin Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Administrative notes or follow-up actions..."
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

export const StationAdminWidgets = () => {
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
  if (statsLoading || usersLoading || incidentsLoading) {
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
  if (statsError || usersError || incidentsError) {
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
  const stationUsers = users?.filter((u: any) => u.stationId === user?.stationId) || [];
  const stationStaff = stationUsers.filter((u: any) => u.role === 'station_staff');
  const activeStaff = stationUsers.filter((u: any) => u.isActive !== false);
  
  const resolutionRate = stats?.total ? Math.round((stats.resolved / stats.total) * 100) : 0;
  const pendingRate = stats?.total ? Math.round((stats.pending / stats.total) * 100) : 0;

  // Get station incidents and available actions
  const stationIncidents = incidents?.filter((incident: any) => 
    incident.stationId === user?.stationId || 
    incident.assignedToId === user?.id ||
    stationUsers.some((staffMember: any) => staffMember.id === incident.assignedToId)
  ) || [];

  const unassignedIncidents = stationIncidents.filter((incident: any) => 
    !incident.assignedToId && incident.status === 'reported'
  ).slice(0, 3);

  const criticalIncidents = stationIncidents.filter((incident: any) => 
    incident.priority === 'critical' || incident.priority === 'high'
  ).slice(0, 4);

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
        {/* Station Overview */}
        <Card className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Shield className="h-5 w-5 text-primary" />
              Station Overview
              <Badge variant="outline" className="ml-auto">Live</Badge>
            </CardTitle>
            <CardDescription>
              Your station's current status and metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
                <span className="text-sm font-medium text-foreground">Total Staff</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{stationUsers.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                <span className="text-sm font-medium text-foreground">Active Staff</span>
                <span className="font-bold text-green-600 dark:text-green-400">{activeStaff.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
                <span className="text-sm font-medium text-foreground">Station Cases</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{stationIncidents.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium text-foreground">Resolution Rate</span>
                <span className="font-bold text-foreground">{resolutionRate}%</span>
              </div>
              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-foreground font-medium">Performance</span>
                  <span className="text-foreground font-bold">{resolutionRate}%</span>
                </div>
                <Progress value={resolutionRate} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Management with Actions */}
        <Card className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-primary" />
              Staff Management
            </CardTitle>
            <CardDescription>
              Manage your station's personnel and assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stationUsers.length > 0 ? (
                stationUsers.slice(0, 3).map((staff: any) => (
                  <div key={staff.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{staff.firstName} {staff.lastName}</p>
                      <p className="text-xs text-gray-500 capitalize">{staff.role.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={staff.isActive !== false ? "secondary" : "outline"}>
                        {staff.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                      {staff.role === 'station_staff' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                        >
                          <UserCheck className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No staff members found</p>
                  <p className="text-xs">Invite staff to get started</p>
                </div>
              )}
              <div className="pt-2 flex gap-2">
                <Link href="/users">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Users className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </Link>
                <Link href="/invitations">
                  <Button size="sm" className="flex-1">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Cases Requiring Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical Cases
              <Badge variant="destructive" className="ml-auto text-xs">
                {criticalIncidents.length} Critical
              </Badge>
            </CardTitle>
            <CardDescription>
              High priority cases requiring immediate admin attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalIncidents.length > 0 ? (
                criticalIncidents.map((incident: any) => (
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
                            className="bg-purple-600 hover:bg-purple-700 text-white h-6 px-2 text-xs"
                            disabled={assignMutation.isPending}
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
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
                  <p className="text-xs">All high priority cases are under control</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unassigned Cases for Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Unassigned Cases
              <Badge variant="outline" className="ml-auto text-xs">
                {unassignedIncidents.length} Pending
              </Badge>
            </CardTitle>
            <CardDescription>
              New cases waiting for staff assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unassignedIncidents.length > 0 ? (
                unassignedIncidents.map((incident: any) => (
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
                        <UserCheck className="w-3 h-3 mr-1" />
                        Assign Staff
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
                  <p className="text-xs">Great job keeping up with assignments!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Station Activity Overview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Station Activity
              <Badge variant="outline" className="ml-auto text-xs">Live</Badge>
            </CardTitle>
            <CardDescription>
              Monitor your station's real-time activity and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-blue-600">{stationIncidents.length}</div>
                <p className="text-sm text-gray-600">Total Cases</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-yellow-600">{unassignedIncidents.length}</div>
                <p className="text-sm text-gray-600">Unassigned</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-green-600">{stats?.resolved || 0}</div>
                <p className="text-sm text-gray-600">Resolved</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-purple-600">{activeStaff.length}</div>
                <p className="text-sm text-gray-600">Active Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Menu */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Admin Actions
            </CardTitle>
            <CardDescription>
              Common station management tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/incidents">
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Manage Incidents ({stationIncidents.length})
                </Button>
              </Link>
              <Link href="/users">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Staff ({stationUsers.length})
                </Button>
              </Link>
              <Link href="/invitations">
                <Button variant="outline" className="w-full justify-start">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitations
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <StaffAssignmentModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedIncident(null);
        }}
        incident={selectedIncident}
        users={stationUsers}
        onAssign={handleAssignmentSubmit}
      />

      <AdminResolutionModal
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