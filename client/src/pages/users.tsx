import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Edit, Mail, Trash2, ArrowRight, Building2, MapPin } from "lucide-react";
import { getUsers, getOrganizations, getStations, migrateUser } from "@/lib/api";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { formatDate } from "@/lib/dateUtils";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [userToEdit, setUserToEdit] = useState<any>(null);
  const [userToMigrate, setUserToMigrate] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "",
    password: "",
  });
  const [editFormData, setEditFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "",
    organizationId: "",
    stationId: "",
  });
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "",
    organisationId: "",
    stationId: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterOrg, setFilterOrg] = useState("all");
  const [filterStation, setFilterStation] = useState("all");
  const [migrationData, setMigrationData] = useState({
    stationId: "",
  });

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => getUsers(),
    enabled: !!currentUser,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Filter and group users alphabetically with organization/station separation
  const filteredAndGroupedUsers = useMemo(() => {
    // First filter users
    const filtered = users?.filter((user: any) => {
      // Exclude main admin users
      if (user.role === 'main_admin') return false;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        const email = user.email || '';
        const phone = user.phone || '';
        
        const nameMatch = `${firstName} ${lastName}`.toLowerCase().includes(searchLower);
        const emailMatch = email.toLowerCase().includes(searchLower);
        const phoneMatch = phone.toLowerCase().includes(searchLower);
        
        if (!nameMatch && !emailMatch && !phoneMatch) return false;
      }
      
      // Role filter
      if (filterRole !== "all" && user.role !== filterRole) return false;
      
      // Organization filter (for main admins)
      if (currentUser?.role === 'main_admin' && filterOrg !== "all" && user.organisationId?.toString() !== filterOrg) return false;
      
      // Station filter (for super admins)
      if (currentUser?.role === 'super_admin' && filterStation !== "all" && user.stationId?.toString() !== filterStation) return false;
      
      return true;
    }) || [];

    // Group by organization for main admins, by station for super admins, otherwise just alphabetically
    if (currentUser?.role === 'main_admin') {
      const grouped = filtered.reduce((acc: any, user: any) => {
        const orgName = user.organizationName || 'Unassigned';
        if (!acc[orgName]) {
          acc[orgName] = [];
        }
        acc[orgName].push(user);
        return acc;
      }, {});

      // Sort organizations alphabetically and users within each organization
      Object.keys(grouped).forEach(orgName => {
        grouped[orgName].sort((a: any, b: any) => {
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
      });

      return grouped;
    } else if (currentUser?.role === 'super_admin') {
      const grouped = filtered.reduce((acc: any, user: any) => {
        const stationName = user.stationName || 'Unassigned';
        if (!acc[stationName]) {
          acc[stationName] = [];
        }
        acc[stationName].push(user);
        return acc;
      }, {});

      // Sort stations alphabetically and users within each station
      Object.keys(grouped).forEach(stationName => {
        grouped[stationName].sort((a: any, b: any) => {
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
      });

      return grouped;
    } else {
      // Just sort alphabetically for other roles
      filtered.sort((a: any, b: any) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      return { 'All Users': filtered };
    }
  }, [users, searchTerm, filterRole, filterOrg, filterStation, currentUser?.role]);

  // Flattened users for count
  const filteredUsers = useMemo(() => {
    return Object.values(filteredAndGroupedUsers).flat();
  }, [filteredAndGroupedUsers]);

  const { data: organizations } = useQuery({
    queryKey: ["/api/organizations"],
    queryFn: getOrganizations,
    enabled: !!currentUser && ['main_admin', 'super_admin', 'station_admin'].includes(currentUser.role)
  });

  const { data: stations } = useQuery({
    queryKey: ["/api/stations"],
    queryFn: () => getStations(),
    enabled: !!currentUser && ['main_admin', 'super_admin', 'station_admin'].includes(currentUser.role)
  });

  const sendInvitationMutation = useMutation({
    mutationFn: (data: typeof inviteData) => apiRequest('/api/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        role: data.role,
        organisationId: data.organisationId || undefined,
        stationId: data.stationId || undefined,
      })
    }),
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The invitation has been sent successfully.",
      });
      setShowInviteModal(false);
      setInviteData({ email: "", role: "", organisationId: "", stationId: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiRequest(`/api/users/${userId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
      setShowDeleteModal(false);
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  });

  const editUserMutation = useMutation({
    mutationFn: ({ userId, userData }: { userId: string; userData: any }) => 
      apiRequest(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      }),
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
      setShowEditModal(false);
      setUserToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    }
  });

  const migrateMutation = useMutation({
    mutationFn: ({ userId, stationId }: { userId: string; stationId: string }) => 
      migrateUser(userId, stationId),
    onSuccess: (data) => {
      toast({
        title: t('migrationSuccess'),
        description: data.message || t('migrationSuccess'),
      });
      setShowMigrateModal(false);
      setUserToMigrate(null);
      setMigrationData({ stationId: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: t('migrationFailed'),
        description: error.message || t('migrationFailed'),
        variant: "destructive",
      });
    }
  });

  const getRoleBadge = (role: string) => {
    if (!role) return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Unknown</Badge>;
    
    const roleColors = {
      main_admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      super_admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      station_admin: "bg-green-500/20 text-green-400 border-green-500/30",
      station_staff: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      citizen: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
    
    return (
      <Badge className={roleColors[role as keyof typeof roleColors] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  const getAvailableRoles = () => {
    switch (currentUser?.role) {
      case 'main_admin':
        return ['super_admin'];
      case 'super_admin':
        return ['station_admin'];
      case 'station_admin':
        return ['station_staff'];
      default:
        return [];
    }
  };

  const handleClose = () => {
    setShowCreateModal(false);
    setFormData({ email: "", firstName: "", lastName: "", phone: "", role: "", password: "" });
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendInvitationMutation.mutate(inviteData);
  };

  const handleDeleteUser = (userObj: any) => {
    setUserToDelete(userObj);
    setShowDeleteModal(true);
  };

  const handleEditUser = (userObj: any) => {
    setUserToEdit(userObj);
    setEditFormData({
      email: userObj.email,
      firstName: userObj.firstName,
      lastName: userObj.lastName,
      phone: userObj.phone || "",
      role: userObj.role,
      organizationId: userObj.organisationId || "",
      stationId: userObj.stationId || "",
    });
    setShowEditModal(true);
  };

  const handleMigrateUser = (userObj: any) => {
    setUserToMigrate(userObj);
    setMigrationData({ stationId: "" });
    setShowMigrateModal(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userToEdit) {
      editUserMutation.mutate({
        userId: userToEdit.id.toString(),
        userData: editFormData,
      });
    }
  };

  const handleMigrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userToMigrate && migrationData.stationId) {
      migrateMutation.mutate({
        userId: userToMigrate.id,
        stationId: migrationData.stationId,
      });
    }
  };

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome to Rindwa Admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {currentUser?.role === 'main_admin' 
            ? 'All Users Management' 
            : currentUser?.role === 'super_admin' 
              ? 'Organization Users Management' 
              : currentUser?.role === 'station_admin' 
                ? 'Station Users Management' 
                : 'Users Management'
          }
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {currentUser?.role === 'main_admin' 
            ? 'Manage users across all organizations' 
            : currentUser?.role === 'super_admin' 
              ? 'Manage users across organization stations' 
              : currentUser?.role === 'station_admin' 
                ? 'Manage users within your station' 
                : 'Manage system users'
          }
        </p>
      </div>
      <div className="space-y-6">
                <div className="flex justify-between items-center">
          <div></div>
          <div className="flex gap-2">
            <Button onClick={() => setShowInviteModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
            {currentUser?.role === 'main_admin' && (
              <Button onClick={() => setShowCreateModal(true)} className="bg-red-600 hover:bg-red-700">
                <Plus className="w-4 h-4 mr-2" />
                New User
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filter Section */}
        <Card className="bg-card border">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search users by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="station_admin">Station Admin</SelectItem>
                    <SelectItem value="station_staff">Station Staff</SelectItem>
                    <SelectItem value="citizen">Citizen</SelectItem>
                  </SelectContent>
                </Select>
                {currentUser?.role === 'main_admin' && (
                  <Select value={filterOrg} onValueChange={setFilterOrg}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Organizations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      {organizations?.map((org: any) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {currentUser?.role === 'super_admin' && (
                  <Select value={filterStation} onValueChange={setFilterStation}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Stations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stations</SelectItem>
                      {stations?.map((station: any) => (
                        <SelectItem key={station.id} value={station.id.toString()}>
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardHeader>
                          <CardTitle className="flex items-center space-x-2 text-foreground">
              <Users className="w-5 h-5 text-blue-400" />
              <span>
                {currentUser?.role === 'main_admin' 
                  ? 'Users' 
                  : currentUser?.role === 'super_admin' 
                    ? 'Organization Station Users' 
                    : currentUser?.role === 'station_admin' 
                      ? 'Station Users' 
                      : 'Users'
                }
                {filteredUsers?.length > 0 && (
                  <Badge variant="outline" className="ml-2 bg-slate-700 text-slate-300 border-slate-600">
                    {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                  </Badge>
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                                    <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="font-semibold">Organization</TableHead>
                <TableHead className="font-semibold">Station</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Created</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(filteredAndGroupedUsers)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([groupName, users]) => (
                      <React.Fragment key={groupName}>
                        {/* Organization/Station Header for Main Admin and Super Admin */}
                        {(currentUser?.role === 'main_admin' || currentUser?.role === 'super_admin') && (
                                              <TableRow className="bg-muted/50 hover:bg-muted border-b">
                      <TableCell colSpan={9} className="font-semibold text-foreground py-3">
                              <div className="flex items-center space-x-2">
                                {currentUser?.role === 'main_admin' ? (
                                  <>
                                    <Building2 className="w-4 h-4 text-blue-400" />
                                    <span>{groupName}</span>
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="w-4 h-4 text-green-400" />
                                    <span>{groupName}</span>
                                  </>
                                )}
                                <Badge variant="outline" className="ml-2">
                                  {(users as any[]).length} {(users as any[]).length === 1 ? 'user' : 'users'}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {/* Users in this organization */}
                        {(users as any[]).map((user: any) => (
                          <TableRow key={user.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                                                  <span className="text-foreground">{user.firstName} {user.lastName}</span>
                                {user.isInvited && (
                                  <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                                    📧 Invited
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.phone || "No phone"}</TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell>
                              {user.organizationName || "Not assigned"}
                            </TableCell>
                            <TableCell>
                              {user.stationName || "Not assigned"}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={user.isActive ? "default" : "secondary"}
                                className={user.isActive 
                                  ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                                }
                              >
                                {user.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(user.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  title="Edit user"
                                  onClick={() => handleEditUser(user)}
                                  className="hover:bg-accent"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                {/* Only show migration button for super admins viewing station_admin/station_staff */}
                                {currentUser?.role === 'super_admin' && ['station_admin', 'station_staff'].includes(user.role) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    title={t('migrateUser')}
                                    onClick={() => handleMigrateUser(user)}
                                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  title="Delete user"
                                  onClick={() => handleDeleteUser(user)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                </TableBody>
              </Table>
            )}
            
            {filteredUsers?.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                No users found. Create your first user.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Invitation Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invitation</DialogTitle>
            <DialogDescription>
              Send an invitation to create a new user account with the appropriate role and permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                placeholder="Enter email address"
                required
              />
            </div>
            <div>
              <Label htmlFor="inviteRole">Role</Label>
              <Select value={inviteData.role} onValueChange={(value) => setInviteData({...inviteData, role: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map(role => (
                    <SelectItem key={role} value={role}>
                      {role.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {currentUser?.role === 'main_admin' && (
              <div>
                <Label htmlFor="organization">Organization</Label>
                <Select value={inviteData.organisationId} onValueChange={(value) => setInviteData({...inviteData, organisationId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map((org: any) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentUser?.role === 'super_admin' && (
              <div>
                <Label htmlFor="station">Station</Label>
                <Select value={inviteData.stationId} onValueChange={(value) => setInviteData({...inviteData, stationId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations?.map((station: any) => (
                      <SelectItem key={station.id} value={station.id.toString()}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={sendInvitationMutation.isPending}>
                {sendInvitationMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateModal} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account with personal information and credentials.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
            
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
            
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            
            <div>
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Password"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              disabled={!formData.email || !formData.firstName || !formData.lastName || !formData.role || !formData.password}
              className="bg-red-600 hover:bg-red-700"
            >
              Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {userToDelete && (
            <div className="py-4">
              <p className="text-sm text-gray-600">
                You are about to delete:
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mt-2">
                <p className="font-medium">{userToDelete.firstName} {userToDelete.lastName}</p>
                <p className="text-sm text-gray-600">{userToDelete.email}</p>
                <p className="text-sm text-gray-600">Role: {userToDelete.role.replace('_', ' ')}</p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Role changes require appropriate permissions.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">First Name</Label>
                <Input
                  id="editFirstName"
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="editLastName">Last Name</Label>
                <Input
                  id="editLastName"
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                placeholder="Email address"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="editPhone">Phone</Label>
              <Input
                id="editPhone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                placeholder="Phone number"
              />
            </div>
            
            <div>
              <Label htmlFor="editRole">Role</Label>
              <Select value={editFormData.role} onValueChange={(value) => setEditFormData({...editFormData, role: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map(role => (
                    <SelectItem key={role} value={role}>
                      {role.replace('_', ' ')}
                    </SelectItem>
                  ))}
                  {/* Also allow keeping the current role */}
                  {!getAvailableRoles().includes(editFormData.role) && (
                    <SelectItem value={editFormData.role}>
                      {editFormData.role.replace('_', ' ')}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="editOrganization">Organization</Label>
              <Select value={editFormData.organizationId || "none"} onValueChange={(value) => setEditFormData({...editFormData, organizationId: value === "none" ? "" : value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No organization</SelectItem>
                  {organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="editStation">Station</Label>
              <Select value={editFormData.stationId || "none"} onValueChange={(value) => setEditFormData({...editFormData, stationId: value === "none" ? "" : value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No station</SelectItem>
                  {stations?.map((station: any) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editUserMutation.isPending}>
                {editUserMutation.isPending ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Migration Modal */}
      <Dialog open={showMigrateModal} onOpenChange={setShowMigrateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('migrateUser')}</DialogTitle>
            <DialogDescription>
              {t('confirmMigration')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMigrationSubmit} className="space-y-4">
            <div>
              <Label htmlFor="userName">{t('name')}</Label>
              <Input
                id="userName"
                value={userToMigrate ? `${userToMigrate.firstName} ${userToMigrate.lastName}` : ''}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="userRole">{t('role')}</Label>
              <Input
                id="userRole"
                value={userToMigrate ? userToMigrate.role.replace('_', ' ') : ''}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="targetStation">{t('selectTargetStation')}</Label>
              <Select value={migrationData.stationId} onValueChange={(value) => setMigrationData({...migrationData, stationId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectTargetStation')} />
                </SelectTrigger>
                <SelectContent>
                  {stations?.map((station: any) => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowMigrateModal(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={migrateMutation.isPending}>
                {migrateMutation.isPending ? t('loading') : t('migrateUser')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
