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
    mutationFn: ({ id, data }: { id: number; data: any }) => assignIncident(id, data),
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
        assignedToId: parseInt(assigneeId),
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
        assignedToId: parseInt(user.userId),
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

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
              {incident.reporterInfo ? (
                <>
                  <div>
                    <h4 className="font-medium text-gray-900">Name</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {incident.reporterInfo.name || 'Not provided'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Contact
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {incident.reporterInfo.email}
                      </p>
                    </div>
                    
                    {incident.reporterInfo.phone && (
                      <div>
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Contact
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {incident.reporterInfo.phone}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900">Reporter Type</h4>
                    <Badge className="mt-1" variant={incident.reporterInfo.role === 'citizen' ? 'secondary' : 'default'}>
                      {incident.reporterInfo.role === 'citizen' ? 'Citizen Report' : 'Official Report'}
                    </Badge>
                  </div>
                  
                  {/* Emergency Contacts */}
                  {incident.reporterInfo.emergencyContacts && incident.reporterInfo.emergencyContacts.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-3">
                        <Shield className="h-4 w-4 text-red-600" />
                        Emergency Contacts
                      </h4>
                      <div className="space-y-2">
                        {incident.reporterInfo.emergencyContacts.map((contact, index) => (
                          <div key={contact.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900">{contact.name}</span>
                                {contact.isPrimary && (
                                  <Badge variant="destructive" className="text-xs">Primary</Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {contact.relationship} • {contact.phone}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`tel:${contact.phone}`, '_self')}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Anonymous Report</p>
                  <p className="text-xs text-gray-400 mt-1">
                    No reporter information available
                  </p>
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
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="assigned">Assigned</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
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
                  {incident.locationAddress || "No location specified"}
                </p>
                {incident.locationLat && incident.locationLng && (
                  <p className="text-xs text-gray-500 mt-1">
                    Coordinates: {incident.locationLat}, {incident.locationLng}
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