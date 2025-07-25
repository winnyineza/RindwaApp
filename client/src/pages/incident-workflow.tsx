import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, User, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { updateIncident, escalateIncident } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function IncidentWorkflowPage() {
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["/api/incidents"],
    refetchInterval: 30000,
  });

  // Mutation for marking incident as complete
  const markCompleteMutation = useMutation({
    mutationFn: (incidentId: string) => updateIncident(incidentId, { status: 'resolved' }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Incident marked as completed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setSelectedIncident(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark incident as complete",
        variant: "destructive",
      });
    },
  });

  // Mutation for escalating incident
  const escalateMutation = useMutation({
    mutationFn: (incidentId: string) => escalateIncident(incidentId, { reason: 'Escalated from workflow' }),
    onSuccess: () => {
      toast({
        title: "Success", 
        description: "Incident escalated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setSelectedIncident(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to escalate incident",
        variant: "destructive",
      });
    },
  });

  const handleMarkComplete = () => {
    if (!selectedIncident) return;
    
    if (window.confirm('Are you sure you want to mark this incident as complete?')) {
      markCompleteMutation.mutate(selectedIncident.id);
    }
  };

  const handleEscalate = () => {
    if (!selectedIncident) return;
    
    if (window.confirm('Are you sure you want to escalate this incident?')) {
      escalateMutation.mutate(selectedIncident.id);
    }
  };

  const incidentTypes = [
    {
      type: "Fire Emergency",
      keywords: ["fire", "burn", "smoke", "flames", "explosion", "burning"],
      organization: "Rwanda National Police",
      priority: "high",
      responseTime: "5 minutes",
      workflow: [
        "Immediate dispatch to location",
        "Contact Fire Department",
        "Secure perimeter",
        "Evacuate if necessary",
        "Coordinate with emergency services"
      ],
      icon: "🔥"
    },
    {
      type: "Medical Emergency",
      keywords: ["medical", "health", "ambulance", "injury", "accident", "sick"],
      organization: "Ministry of Health",
      priority: "critical",
      responseTime: "3 minutes",
      workflow: [
        "Dispatch ambulance immediately",
        "Contact nearest hospital",
        "Provide first aid instructions",
        "Coordinate with medical team",
        "Prepare emergency room"
      ],
      icon: "🏥"
    },
    {
      type: "Criminal Investigation",
      keywords: ["theft", "robbery", "fraud", "investigation", "criminal", "scam"],
      organization: "Rwanda Investigation Bureau",
      priority: "medium",
      responseTime: "15 minutes",
      workflow: [
        "Secure crime scene",
        "Collect evidence",
        "Interview witnesses",
        "File initial report",
        "Begin investigation"
      ],
      icon: "🔍"
    },
    {
      type: "General Security",
      keywords: ["security", "disturbance", "noise", "public", "safety"],
      organization: "Rwanda National Police",
      priority: "medium",
      responseTime: "10 minutes",
      workflow: [
        "Assess situation",
        "Dispatch patrol unit",
        "Ensure public safety",
        "Document incident",
        "Follow up as needed"
      ],
      icon: "👮"
    }
  ];

  const getIncidentType = (title: string, description: string) => {
    const text = `${title} ${description}`.toLowerCase();
    return incidentTypes.find(type => 
      type.keywords.some(keyword => text.includes(keyword))
    ) || incidentTypes[3]; // Default to General Security
  };

  const priorityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800"
  };

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    assigned: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    resolved: "bg-green-100 text-green-800",
    escalated: "bg-red-100 text-red-800"
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Incident Workflow Management</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Structured incident handling based on incident types
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Incident Assignment Rules</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incidentTypes.map((type, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold flex items-center space-x-2">
                        <span className="text-2xl">{type.icon}</span>
                        <span>{type.type}</span>
                      </h3>
                      <Badge className={priorityColors[type.priority as keyof typeof priorityColors]}>
                        {type.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Organization:</strong> {type.organization}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Response Time:</strong> {type.responseTime}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Keywords:</strong> {type.keywords.join(", ")}
                    </p>
                    <div className="mt-2">
                      <strong className="text-sm">Workflow Steps:</strong>
                      <ol className="list-decimal list-inside text-sm text-gray-600 mt-1">
                        {type.workflow.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Current Incidents</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(incidents) && incidents.map((incident: any) => {
                    const incidentType = getIncidentType(incident.title, incident.description);
                    return (
                      <div 
                        key={incident.id} 
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold flex items-center space-x-2">
                            <span className="text-lg">{incidentType.icon}</span>
                            <span>{incident.title}</span>
                          </h3>
                          <div className="flex space-x-2">
                            <Badge className={priorityColors[incident.priority as keyof typeof priorityColors]}>
                              {incident.priority?.toUpperCase()}
                            </Badge>
                            <Badge className={statusColors[incident.status as keyof typeof statusColors]}>
                              {incident.status?.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Type:</strong> {incidentType.type}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Organization:</strong> {incidentType.organization}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Created:</strong> {formatDate(incident.createdAt)}
                        </p>
                      </div>
                    );
                  })}
                  {Array.isArray(incidents) && incidents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No incidents found.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {selectedIncident && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Incident Details & Workflow</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Incident Information</h3>
                  <div className="space-y-2">
                    <p><strong>Title:</strong> {selectedIncident.title}</p>
                    <p><strong>Description:</strong> {selectedIncident.description}</p>
                    <p><strong>Location:</strong> {selectedIncident.locationAddress}</p>
                    <p><strong>Priority:</strong> 
                      <Badge className={`ml-2 ${priorityColors[selectedIncident.priority as keyof typeof priorityColors]}`}>
                        {selectedIncident.priority?.toUpperCase()}
                      </Badge>
                    </p>
                    <p><strong>Status:</strong> 
                      <Badge className={`ml-2 ${statusColors[selectedIncident.status as keyof typeof statusColors]}`}>
                        {selectedIncident.status?.toUpperCase()}
                      </Badge>
                    </p>
                    <p><strong>Created:</strong> {formatDate(selectedIncident.createdAt)}</p>
                    <p><strong>Upvotes:</strong> {selectedIncident.upvotes || 0}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-4">Recommended Workflow</h3>
                  <div className="space-y-2">
                    {getIncidentType(selectedIncident.title, selectedIncident.description).workflow.map((step, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                          {index + 1}
                        </div>
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold mb-2">Quick Actions</h4>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleMarkComplete}
                        disabled={markCompleteMutation.isPending || selectedIncident?.status === 'resolved'}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {markCompleteMutation.isPending ? 'Completing...' : 'Mark Complete'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-red-600 text-red-600 hover:bg-red-50"
                        onClick={handleEscalate}
                        disabled={escalateMutation.isPending || selectedIncident?.status === 'escalated'}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {escalateMutation.isPending ? 'Escalating...' : 'Escalate'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}