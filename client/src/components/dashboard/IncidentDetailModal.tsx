import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  MapPin, 
  Calendar, 
  User, 
  AlertTriangle, 
  Phone, 
  Mail, 
  Clock,
  UserPlus,
  Edit,
  X,
  Save,
  Shield
} from "lucide-react";
import { Incident } from "@/types";
import { getUsers, assignIncident, updateIncident, escalateIncident } from "@/lib/api";
import { formatForDisplay, formatAssignmentTime } from "../../utils/dateUtils";

// Add missing formatDate function
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface IncidentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
}

export const IncidentDetailModal = ({ isOpen, onClose, incident }: IncidentDetailModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [escalationReason, setEscalationReason] = useState("");

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    queryFn: getUsers,
    enabled: isOpen && (user?.role === 'station_admin' || user?.role === 'super_admin'),
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
      setIsAssigning(false);
      setAssigneeId("");
      setNotes("");
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
      toast({
        title: "Success",
        description: "Incident updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => escalateIncident(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Incident escalated successfully",
      });
      setIsEscalating(false);
      setEscalationReason("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    if (!incident || !assigneeId) return;
    
    assignMutation.mutate({
      id: incident.id,
      data: {
        assignedToId: assigneeId, // UUID string
        priority: priority || incident.priority,
        notes: notes || incident.notes,
      },
    });
  };

  const handleUpdate = () => {
    if (!incident) return;
    
    updateMutation.mutate({
      id: incident.id,
      data: {
        priority: priority || incident.priority,
        status: status || incident.status,
        notes: notes || incident.notes,
      },
    });
  };

  const handleEscalate = () => {
    if (!incident || !escalationReason.trim()) return;
    
    escalateMutation.mutate({
      id: incident.id,
      data: {
        reason: escalationReason,
      },
    });
  };

  const handleSelfAssign = () => {
    if (!incident || !user) return;
    
    assignMutation.mutate({
      id: incident.id,
      data: {
        assignedToId: user.userId || user.id, // UUID string
        priority: incident.priority,
        notes: incident.notes || "",
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      pending: "bg-orange-100 text-orange-800",
      assigned: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
      escalated: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge className={cn("capitalize", statusClasses[status as keyof typeof statusClasses])}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityClasses = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge className={cn("capitalize", priorityClasses[priority as keyof typeof priorityClasses])}>
        {priority}
      </Badge>
    );
  };

  // Using shared date utilities instead of custom formatDate

  const canAssign = user?.role === 'station_admin' || user?.role === 'super_admin';
  const canEdit = user?.role === 'station_admin' || user?.role === 'super_admin' || user?.role === 'station_staff';
  const canSelfAssign = user?.role === 'station_staff' && !incident?.assignedToId;
  const canEscalate = user?.role === 'station_staff' || user?.role === 'station_admin' || user?.role === 'super_admin';

  if (!incident) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Incident #{incident.id.toString().padStart(4, '0')} - {incident.title}
          </DialogTitle>
          <DialogDescription>
            View and manage incident details, assignments, and status updates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reporter Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Reporter Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {incident.reporter_name || incident.reporter_phone || incident.reporter_email || 
               (incident.reporter_emergency_contacts && incident.reporter_emergency_contacts.length > 0) ? (
                <>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Reporter Details</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-lg">👤</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {incident.reporter_name || 'Citizen Report'}
                          </p>
                          <p className="text-sm text-gray-500">Reporter</p>
                        </div>
                      </div>
                      
                      {incident.reporter_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-700">Phone:</span>
                          <span className="text-sm text-gray-900">{incident.reporter_phone}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`tel:${incident.reporter_phone}`, '_self')}
                            className="ml-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      {incident.reporter_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-700">Email:</span>
                          <span className="text-sm text-gray-900">{incident.reporter_email}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`mailto:${incident.reporter_email}`, '_self')}
                            className="ml-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {incident.reporter_emergency_contacts && incident.reporter_emergency_contacts.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-red-600" />
                        Emergency Contacts Notified
                      </h4>
                      <div className="space-y-2">
                        {incident.reporter_emergency_contacts.map((contact, index) => (
                          <div key={index} className="bg-red-50 border border-red-100 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900">{contact.name}</p>
                                  <Badge variant="secondary" className="text-xs">
                                    {contact.relationship}
                                  </Badge>
                                </div>
                                <p className="text-sm font-mono text-gray-600 mt-1">{contact.phone}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`tel:${contact.phone}`, '_self')}
                                className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1"
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                        <span className="text-green-600">✓</span>
                        These contacts were automatically notified when the incident was reported
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Anonymous Report</h4>
                  <p className="text-sm text-gray-500">No reporter information available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Incident Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Description</h4>
                <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Type</h4>
                  <div className="mt-1">
                    <Badge variant="outline" className="capitalize">
                      {incident.type || 'Other'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Status</h4>
                  <div className="mt-1">
                    {isEditing ? (
                      <Select value={status || incident.status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {user?.role === 'station_staff' ? (
                            // Station staff can only progress through workflow
                            <>
                              {incident.status === 'assigned' && (
                                <SelectItem value="in_progress">Start Working (In Progress)</SelectItem>
                              )}
                              {incident.status === 'in_progress' && (
                                <>
                                  <SelectItem value="resolved">Mark as Resolved</SelectItem>
                                  <SelectItem value="escalated">Escalate for Help</SelectItem>
                                </>
                              )}
                              {incident.status === 'resolved' && (
                                <SelectItem value="resolved">Resolved</SelectItem>
                              )}
                              {incident.status === 'escalated' && (
                                <SelectItem value="in_progress">Resume Working</SelectItem>
                              )}
                            </>
                          ) : (
                            // Admins can set any status
                            <>
                              <SelectItem value="reported">Reported</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="assigned">Assigned</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                              <SelectItem value="escalated">Escalated</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      getStatusBadge(incident.status)
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Priority</h4>
                  <div className="mt-1">
                    {isEditing || isAssigning ? (
                      <Select value={priority || incident.priority} onValueChange={setPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getPriorityBadge(incident.priority)
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {incident.location?.address || "No location specified"}
                </p>
                {incident.location?.lat && incident.location?.lng && (
                  <p className="text-xs text-gray-500 mt-1">
                    Coordinates: {incident.location.lat}, {incident.location.lng}
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Reported:</span> {formatDate(incident.createdAt)}
                </p>
                {incident.updatedAt && incident.updatedAt !== incident.createdAt && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Updated:</span> {formatDate(incident.updatedAt)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assignment and Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment & Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assigned To
                </h4>
                <div className="mt-2">
                  {isAssigning ? (
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.filter(u => u.role === 'station_staff' || u.role === 'station_admin').map(u => (
                          <SelectItem key={u.id} value={u.id.toString()}>
                            {u.firstName} {u.lastName} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : incident.assignedToId ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm">Assigned to staff member</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Not assigned</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Notes</h4>
                <div className="mt-2">
                  {isEditing || isAssigning ? (
                    <Textarea
                      value={notes || incident.notes || ""}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes or updates..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md min-h-[100px]">
                      {incident.notes || "No notes available"}
                    </p>
                  )}
                </div>
              </div>

              {/* Escalation Information */}
              {(incident.escalatedBy || incident.escalatedAt || incident.escalationReason) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Escalation Details
                  </h4>
                  <div className="mt-2 space-y-2">
                    {incident.escalatedAt && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Escalated:</span>
                        <span className="text-sm text-gray-600 ml-2">{formatDate(incident.escalatedAt)}</span>
                      </div>
                    )}
                    {incident.escalationLevel > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Level:</span>
                        <Badge variant="destructive" className="ml-2">Level {incident.escalationLevel}</Badge>
                      </div>
                    )}
                    {incident.escalationReason && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Reason:</span>
                        <p className="text-sm text-gray-600 mt-1 bg-red-50 p-2 rounded-md">
                          {incident.escalationReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Community Engagement & Submission Details */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Community Upvotes */}
                  <div>
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <span className="text-lg">👍</span>
                      Community Support
                    </h4>
                    <div className="mt-2">
                      <Badge 
                        variant={incident.upvotes && incident.upvotes > 0 ? "default" : "secondary"} 
                        className="text-sm"
                      >
                        {incident.upvotes || 0} upvotes
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {incident.upvotes && incident.upvotes > 0 
                          ? `This incident has ${incident.upvotes} community votes` 
                          : 'No community votes yet'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Submission Details */}
                  <div>
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      Submission Info
                    </h4>
                    <div className="mt-2 space-y-1">
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Reported By:</span> {incident.reported_by || 'System User'}
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Incident Type:</span> {incident.type || 'Other'}
                      </div>
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">Submitted:</span> {formatDate(incident.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                {isAssigning ? (
                  <>
                    <Button 
                      onClick={handleAssign} 
                      disabled={!assigneeId || assignMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Assign
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAssigning(false);
                        setAssigneeId("");
                        setNotes("");
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : isEditing ? (
                  <>
                    <Button 
                      onClick={handleUpdate} 
                      disabled={updateMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Update
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setPriority("");
                        setStatus("");
                        setNotes("");
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : isEscalating ? (
                  <>
                    <div className="flex flex-col gap-2 w-full">
                      <Textarea
                        placeholder="Enter escalation reason..."
                        value={escalationReason}
                        onChange={(e) => setEscalationReason(e.target.value)}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleEscalate} 
                          disabled={!escalationReason.trim() || escalateMutation.isPending}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Escalate
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setIsEscalating(false);
                            setEscalationReason("");
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {canAssign && (
                      <Button 
                        onClick={() => setIsAssigning(true)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {incident.assignedToId ? "Reassign" : "Assign"}
                      </Button>
                    )}
                    {canSelfAssign && (
                      <Button 
                        onClick={handleSelfAssign}
                        disabled={assignMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign to Me
                      </Button>
                    )}
                    {canEdit && (
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    {canEscalate && (
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEscalating(true)}
                        className="border-orange-600 text-orange-600 hover:bg-orange-50"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Escalate
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Photo if available */}
        {incident.photoUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Incident Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <img 
                src={incident.photoUrl} 
                alt="Incident photo" 
                className="w-full max-w-lg rounded-lg border"
              />
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};