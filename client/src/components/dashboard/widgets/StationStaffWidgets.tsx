import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  FileText,
  Activity,
  Loader2,
  UserPlus,
  Play,
  Edit3,
  MessageSquare,
  ArrowUp,
  Zap,
  Bell
} from 'lucide-react';
import { getIncidentStats, getIncidents, assignIncident, updateIncident } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Link } from 'wouter';
import { useState } from 'react';
import { Incident } from '@/types';

// Progress Update Modal Component
const ProgressUpdateModal = ({ 
  isOpen, 
  onClose, 
  incident, 
  onUpdate 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  incident: Incident | null; 
  onUpdate: (updateData: { status?: string; notes: string; priority?: string }) => void;
}) => {
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const handleSubmit = () => {
    if (!notes.trim()) return;
    onUpdate({ 
      status: status || undefined,
      priority: priority || undefined,
      notes: notes.trim()
    });
    setNotes("");
    setStatus("");
    setPriority("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Update Case Progress
          </DialogTitle>
          <DialogDescription>
            Add progress notes for: {incident?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-red-600">
              Progress Update *
            </Label>
            <Textarea
              id="notes"
              placeholder="Describe the progress made on this case..."
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
            disabled={!notes.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
          <DialogDescription>
            Resolve case: {incident?.title}
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

export const StationStaffWidgets = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getIncidentStats,
    refetchInterval: 15000, // Optimized: Refresh every 15 seconds for better performance
    refetchOnWindowFocus: true,
    staleTime: 10000, // Consider data fresh for 10 seconds
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
        description: "Case action completed successfully",
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
  if (statsLoading || incidentsLoading) {
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
  if (statsError || incidentsError) {
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
              {incidentsError && <p className="text-red-600">• Failed to load incidents</p>}
              <p className="text-gray-600 mt-4">Please refresh the page or contact support if the issue persists.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate real-time metrics based on actual incidents
  const currentUserId = user?.userId || user?.id;
  const myAssignedIncidents = incidents?.filter(incident => {
    return incident.assignedToId === currentUserId || incident.assignedTo === currentUserId;
  }) || [];

  const myInProgressIncidents = myAssignedIncidents.filter(incident => 
    incident.status === 'in_progress'
  ).length;

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

  const successRate = myAssignedIncidents.length > 0 
    ? Math.round((myResolvedIncidents / myAssignedIncidents.length) * 100) 
    : 0;

  // Get available incidents for quick actions
  const availableIncidents = incidents?.filter(incident => 
    !incident.assignedToId && incident.status === 'reported'
  ).slice(0, 3) || [];

  const myActiveIncidents = myAssignedIncidents.filter(incident => 
    incident.status === 'assigned' || incident.status === 'in_progress'
  ).slice(0, 3) || [];

  // Action handlers
  const handleTakeCase = (incident: Incident) => {
    assignMutation.mutate({
      id: incident.id,
      data: { assignedToId: currentUserId }
    });
  };

  const handleStartWork = (incident: Incident) => {
    updateMutation.mutate({
      id: incident.id,
      data: { status: 'in_progress' }
    });
  };

  const handleProgressUpdate = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowProgressModal(true);
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

  const handleProgressSubmit = (updateData: { status?: string; notes: string; priority?: string }) => {
    if (!selectedIncident) return;
    
    updateMutation.mutate({
      id: selectedIncident.id,
      data: {
        ...updateData,
        progressNotes: ((selectedIncident as any).progressNotes || []).concat({
          note: updateData.notes,
          addedBy: user?.firstName + ' ' + user?.lastName,
          addedAt: new Date().toISOString()
        })
      }
    });
    
    setShowProgressModal(false);
    setSelectedIncident(null);
  };

  const handleResolutionSubmit = (resolutionData: { resolution: string; notes: string }) => {
    if (!selectedIncident) return;
    
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
        {/* My Assignments Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              My Assignments
              <Badge variant="outline" className="ml-auto">Live</Badge>
            </CardTitle>
            <CardDescription>
              Your current incident assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Assigned</span>
                <span className="font-bold text-blue-600">{myAssignedIncidents.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">In Progress</span>
                <span className="font-bold text-orange-600">{myInProgressIncidents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed Today</span>
                <span className="font-bold text-green-600">{myCompletedToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Success Rate</span>
                <span className="font-bold">{successRate}%</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{successRate}%</span>
                </div>
                <Progress value={successRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Performance
            </CardTitle>
            <CardDescription>
              Your work performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Cases Resolved</span>
                </div>
                <span className="font-bold text-green-600">{myResolvedIncidents}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm">Active Cases</span>
                </div>
                <span className="font-bold text-orange-600">{myInProgressIncidents}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Success Rate</span>
                </div>
                <span className="font-bold text-blue-600">{successRate}%</span>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-2">
                  <span>Overall Performance</span>
                  <span>{successRate}%</span>
                </div>
                <Progress value={successRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Priority Breakdown
            </CardTitle>
            <CardDescription>
              Your assignments by priority level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">High Priority</span>
                </div>
                <Badge variant={myHighPriority > 0 ? "destructive" : "secondary"}>
                  {myHighPriority}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Medium Priority</span>
                </div>
                <Badge variant={myMediumPriority > 0 ? "default" : "secondary"}>
                  {myMediumPriority}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Low Priority</span>
                </div>
                <Badge variant="secondary">{myLowPriority}</Badge>
              </div>
              <div className="pt-2">
                <Link href="/incidents">
                  <Button size="sm" className="w-full">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    View All Cases
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Case Actions - Available Cases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Available Cases
              <Badge variant="outline" className="ml-auto text-xs">
                {availableIncidents.length} Available
              </Badge>
            </CardTitle>
            <CardDescription>
              Unassigned cases you can take immediately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableIncidents.length > 0 ? (
                availableIncidents.map((incident: any) => (
                  <div key={incident.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{incident.title}</p>
                        <p className="text-xs text-gray-500 truncate">{incident.description}</p>
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
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleTakeCase(incident)}
                        className="bg-red-600 hover:bg-red-700 text-white h-7 px-3 text-xs"
                        disabled={assignMutation.isPending}
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Take Case
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                      >
                        <MapPin className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardList className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No available cases</p>
                  <p className="text-xs">All cases are currently assigned</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Active Cases with Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              My Active Cases
              <Badge variant="outline" className="ml-auto text-xs">
                {myActiveIncidents.length} Active
              </Badge>
            </CardTitle>
            <CardDescription>
              Cases currently assigned to you with quick actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myActiveIncidents.length > 0 ? (
                myActiveIncidents.map((incident: any) => (
                  <div key={incident.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{incident.title}</p>
                        <p className="text-xs text-gray-600 truncate">{incident.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant={
                            incident.priority === 'critical' || incident.priority === 'high' 
                              ? "destructive" 
                              : incident.priority === 'medium' 
                              ? "default" 
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {incident.priority}
                        </Badge>
                        <Badge 
                          variant={
                            incident.status === 'in_progress' 
                              ? "default" 
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {incident.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {incident.status === 'assigned' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartWork(incident)}
                          className="bg-green-600 hover:bg-green-700 text-white h-6 px-2 text-xs"
                          disabled={updateMutation.isPending}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Start
                        </Button>
                      )}
                      
                      {incident.status === 'in_progress' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleProgressUpdate(incident)}
                            className="bg-blue-600 hover:bg-blue-700 text-white h-6 px-2 text-xs"
                            disabled={updateMutation.isPending}
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Update
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
                  <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No active cases</p>
                  <p className="text-xs">Take on new cases to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Menu */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks and navigation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/incidents">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  My Incidents ({myAssignedIncidents.length})
                </Button>
              </Link>
              <Link href="/incident-workflow">
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="h-4 w-4 mr-2" />
                  Workflow
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Reports
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="outline" className="w-full justify-start">
                  <Award className="h-4 w-4 mr-2" />
                  My Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <ProgressUpdateModal
        isOpen={showProgressModal}
        onClose={() => {
          setShowProgressModal(false);
          setSelectedIncident(null);
        }}
        incident={selectedIncident}
        onUpdate={handleProgressSubmit}
      />

      <QuickResolutionModal
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