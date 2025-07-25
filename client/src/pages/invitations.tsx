import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Mail, Clock, CheckCircle, XCircle, Copy, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/dateUtils";
import { apiRequest } from "@/lib/queryClient";


interface Invitation {
  id: number;
  email: string;
  role: string;
  organisationId?: string; // UUID string, British spelling
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
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Organization/Station filtering and search for main admins and super admins
  const [filterOrganization, setFilterOrganization] = useState("all");
  const [filterStation, setFilterStation] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Get unique organizations and stations from invitations for filtering
  const uniqueOrganizations = Array.from(
    new Set(
      invitations
        ?.map(inv => inv.organizationName)
        .filter((name): name is string => Boolean(name))
    )
  ).sort();

  const uniqueStations = Array.from(
    new Set(
      invitations
        ?.map(inv => inv.stationName)
        .filter((name): name is string => Boolean(name))
    )
  ).sort();

  // Filter invitations based on organization/station filter and search
  const filteredInvitations = invitations?.filter(inv => {
    // Organization filter (for main admins)
    if (user?.role === 'main_admin' && filterOrganization !== "all" && inv.organizationName !== filterOrganization) {
      return false;
    }
    
    // Station filter (for super admins)
    if (user?.role === 'super_admin' && filterStation !== "all" && inv.stationName !== filterStation) {
      return false;
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        inv.email.toLowerCase().includes(searchLower) ||
        inv.role.toLowerCase().includes(searchLower) ||
        (inv.organizationName?.toLowerCase().includes(searchLower)) ||
        (inv.stationName?.toLowerCase().includes(searchLower)) ||
        (inv.inviterName?.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  const resendMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const response = await apiRequest(`/api/invitations/${invitationId}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Invitation resent",
        description: data?.message || "The invitation has been resent successfully.",
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
      return <Badge className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">Accepted</Badge>;
    }
    
    const isExpired = new Date(invitation.expiresAt) < new Date();
    if (isExpired) {
      return <Badge className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200">Expired</Badge>;
    }
    
    return <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">Pending</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      super_admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
      station_admin: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200",
      station_staff: "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200",
    };
    
    return (
      <Badge className={roleColors[role as keyof typeof roleColors] || "bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200"}>
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome to Rindwa Admin">
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            {user?.role === 'main_admin' 
              ? 'Invitations Management' 
              : user?.role === 'super_admin' 
                ? 'Invitations Management' 
                : user?.role === 'station_admin' 
                  ? 'Station Invitations Management' 
                  : 'Invitations Management'
            }
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'main_admin' 
              ? 'Manage invitations across all organizations' 
              : user?.role === 'super_admin' 
                ? 'Manage invitations within your organization' 
                : user?.role === 'station_admin' 
                  ? 'Manage invitations for your station' 
                  : 'Manage user invitations'
            }
          </p>
        </div>
      </div>
      <div className="space-y-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-foreground">
              <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg font-semibold">
                {user?.role === 'main_admin' 
                  ? 'All Invitations' 
                  : user?.role === 'super_admin' 
                    ? 'Invitations' 
                    : user?.role === 'station_admin' 
                      ? 'Station Invitations' 
                      : 'Sent Invitations'
                }
              </span>
            </CardTitle>
            <CardDescription>
              Manage invitations across all organizations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="animate-pulse space-y-4 p-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
            ) : filteredInvitations && filteredInvitations.filter(inv => !inv.isUsed).length > 0 ? (
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Email</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Role</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Organization</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Station</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Expires</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Invited By</TableHead>
                      <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvitations?.filter(inv => !inv.isUsed).map((invitation) => (
                      <TableRow key={invitation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100">{invitation.email}</TableCell>
                        <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">{invitation.organizationName || "N/A"}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">{invitation.stationName || "N/A"}</TableCell>
                        <TableCell>{getStatusBadge(invitation)}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">
                          {formatDate(invitation.expiresAt)}
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">{invitation.inviterName || "System"}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyInvitationLink(invitation.token)}
                              disabled={invitation.isUsed}
                              title="Copy invitation link"
                              className="h-8 w-8 p-0 hover:bg-accent"
                            >
                                                              <Copy className="w-4 h-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendInvitation(invitation.id)}
                              disabled={invitation.isUsed || new Date(invitation.expiresAt) < new Date() || resendMutation.isPending}
                              title="Resend invitation"
                              className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900/50"
                            >
                              <RefreshCw className={`w-4 h-4 text-green-600 dark:text-green-400 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInvitation(invitation.id)}
                              disabled={invitation.isUsed || deleteMutation.isPending}
                              title="Delete invitation"
                              className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredInvitations?.filter(inv => !inv.isUsed).length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                          <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                          <p className="text-lg font-medium mb-2">No pending invitations</p>
                          <p className="text-sm">All invitations have been accepted or expired</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-lg font-medium mb-2">No invitations sent yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Use the Users page to send invitations to new team members</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border hover:bg-card/80 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-foreground">
              <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg font-semibold">Invitation Statistics</span>
            </CardTitle>
            <CardDescription>
              Real-time invitation status overview
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                      {filteredInvitations?.filter(inv => !inv.isUsed && new Date(inv.expiresAt) > new Date()).length || 0}
                    </div>
                    <p className="text-sm font-medium text-foreground">Active Pending</p>
                  </div>
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                      {filteredInvitations?.filter(inv => !inv.isUsed && new Date(inv.expiresAt) < new Date()).length || 0}
                    </div>
                    <p className="text-sm font-medium text-foreground">Expired</p>
                  </div>
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recently Accepted Invitations */}
        {filteredInvitations?.some(inv => inv.isUsed) && (
          <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
            <CardHeader className="bg-gray-50 dark:bg-gray-900/50">
              <CardTitle className="flex items-center space-x-3 text-gray-900 dark:text-white">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-lg font-semibold">Recently Accepted Invitations</span>
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                These invitations have been accepted and users are now active in the Users tab
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {filteredInvitations?.filter(inv => inv.isUsed).slice(0, 5).map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{invitation.email}</div>
                        <div className="text-sm text-muted-foreground">
                          {invitation.role.replace('_', ' ')} • {invitation.organizationName || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 font-medium">
                      ✓ Accepted
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-muted border rounded-lg">
                <p className="text-sm text-foreground text-center">
                  💡 <strong>Note:</strong> Accepted invitations automatically create user accounts. 
                  You can find these new users in the <strong>Users</strong> tab.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}