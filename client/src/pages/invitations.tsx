import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Clock, CheckCircle, XCircle, Copy, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/dateUtils";
import { apiRequest } from "@/lib/queryClient";


interface Invitation {
  id: number;
  email: string;
  role: string;
  organizationId?: number;
  stationId?: number;
  token: string;
  expiresAt: string;
  isUsed: boolean;
  invitedBy: number;
  createdAt: string;
  organizationName?: string;
  stationName?: string;
  inviterName?: string;
}

export default function InvitationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invitations, isLoading, refetch } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations/list"],
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const resendMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const response = await apiRequest(`/api/invitations/${invitationId}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation resent",
        description: data.message || "The invitation has been resent successfully.",
      });
      // Refresh the invitations list
      queryClient.invalidateQueries({ queryKey: ["/api/invitations/list"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error resending invitation",
        description: error.message || "Failed to resend invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const response = await apiRequest(`/api/invitations/${invitationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Invitation deleted",
        description: "The invitation has been deleted successfully.",
      });
      // Refresh the invitations list
      queryClient.invalidateQueries({ queryKey: ["/api/invitations/list"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting invitation",
        description: error.message || "Failed to delete invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyInvitationLink = (token: string) => {
    const invitationUrl = `${window.location.origin}/accept-invitation/${token}`;
    navigator.clipboard.writeText(invitationUrl);
    toast({
      title: "Invitation link copied",
      description: "The invitation link has been copied to your clipboard.",
    });
  };

  const handleResendInvitation = (invitationId: number) => {
    resendMutation.mutate(invitationId);
  };

  const handleDeleteInvitation = (invitationId: number) => {
    if (window.confirm("Are you sure you want to delete this invitation? This action cannot be undone.")) {
      deleteMutation.mutate(invitationId);
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.isUsed) {
      return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
    }
    
    const isExpired = new Date(invitation.expiresAt) < new Date();
    if (isExpired) {
      return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
    }
    
    return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      super_admin: "bg-blue-100 text-blue-800",
      station_admin: "bg-green-100 text-green-800",
      station_staff: "bg-yellow-100 text-yellow-800",
    };
    
    return (
      <Badge className={roleColors[role as keyof typeof roleColors]}>
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <DashboardLayout title="Invitations" subtitle="Manage user invitations">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="w-5 h-5" />
              <span>Sent Invitations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : invitations && invitations.filter(inv => !inv.isUsed).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.filter(inv => !inv.isUsed).map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                      <TableCell>{invitation.organizationName || "N/A"}</TableCell>
                      <TableCell>{invitation.stationName || "N/A"}</TableCell>
                      <TableCell>{getStatusBadge(invitation)}</TableCell>
                      <TableCell>
                        {formatDate(invitation.expiresAt || invitation.expires_at)}
                      </TableCell>
                      <TableCell>{invitation.inviterName || "System"}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInvitationLink(invitation.token)}
                            disabled={invitation.isUsed}
                            title="Copy invitation link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvitation(invitation.id)}
                            disabled={invitation.isUsed || new Date(invitation.expiresAt) < new Date() || resendMutation.isPending}
                            title="Resend invitation"
                          >
                            <RefreshCw className={`w-4 h-4 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInvitation(invitation.id)}
                            disabled={invitation.isUsed || deleteMutation.isPending}
                            title="Delete invitation"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No invitations sent yet</p>
                <p className="text-sm">Use the Users page to send invitations to new team members</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invitation Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-yellow-600">
                  {invitations?.filter(inv => !inv.isUsed && new Date(inv.expiresAt) > new Date()).length || 0}
                </div>
                <p className="text-sm text-gray-600">Active Pending</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-red-600">
                  {invitations?.filter(inv => !inv.isUsed && new Date(inv.expiresAt) < new Date()).length || 0}
                </div>
                <p className="text-sm text-gray-600">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}