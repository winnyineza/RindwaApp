import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Mail, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface InvitationFormData {
  email: string;
  role: string;
  organisationId?: string; // UUID string, British spelling
  stationId?: string; // UUID string
}

interface Invitation {
  id: number;
  email: string;
  role: string;
  organizationId?: number;
  stationId?: number;
  invitedBy: number;
  token: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
}

export const InvitationManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<InvitationFormData>({
    email: '',
    role: '',
    organisationId: undefined,
    stationId: undefined
  });

  // Get available organizations and stations
  const { data: organizations } = useQuery({
    queryKey: ['/api/organizations'],
    enabled: user?.role === 'main_admin'
  });

  const { data: stations } = useQuery({
    queryKey: ['/api/stations'],
    enabled: user?.role === 'super_admin'
  });

  // Get invitations using the correct API endpoint
  const { data: invitations = [] } = useQuery<Invitation[]>({
    queryKey: ['/api/invitations/list'],
    enabled: !!user && ['main_admin', 'super_admin', 'station_admin'].includes(user.role),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const sendInvitationMutation = useMutation({
    mutationFn: (data: InvitationFormData) => apiRequest('/api/invitations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The invitation has been sent successfully.",
      });
      setIsDialogOpen(false);
      setFormData({ email: '', role: '', organisationId: undefined, stationId: undefined });
      queryClient.invalidateQueries({ queryKey: ['/api/invitations/list'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    }
  });

  const getRoleOptions = () => {
    switch (user?.role) {
      case 'main_admin':
        return [{ value: 'super_admin', label: 'Super Administrator' }];
      case 'super_admin':
        return [{ value: 'station_admin', label: 'Station Administrator' }];
      case 'station_admin':
        return [{ value: 'station_staff', label: 'Station Staff' }];
      default:
        return [];
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submissionData = {
      ...formData,
      organisationId: user?.role === 'super_admin' ? user.organisationId : formData.organisationId,
      stationId: user?.role === 'station_admin' ? user.stationId : formData.stationId
    };

    sendInvitationMutation.mutate(submissionData);
  };

  const getStatusBadge = (invitation: Invitation) => {
    const isExpired = new Date(invitation.expiresAt) < new Date();
    
    if (invitation.isUsed) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Accepted</Badge>;
    } else if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    } else {
      return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invitation Management</h2>
          <p className="text-gray-600">Send invitations to new users based on your role</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Invitation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {getRoleOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {user?.role === 'main_admin' && (
                <div>
                  <Label htmlFor="organization">Organization</Label>
                                  <Select 
                  value={formData.organisationId?.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, organisationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {(organizations as any[] || []).map((org: any) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {user?.role === 'super_admin' && (
                <div>
                  <Label htmlFor="station">Station</Label>
                  <Select 
                    value={formData.stationId?.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, stationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select station" />
                    </SelectTrigger>
                    <SelectContent>
                      {(stations as any[] || []).map((station: any) => (
                        <SelectItem key={station.id} value={station.id.toString()}>
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={sendInvitationMutation.isPending}>
                  {sendInvitationMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invitation History</CardTitle>
          <CardDescription>
            Track sent invitations and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Invitations</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        No invitations found. Send your first invitation to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invitations.map((invitation: Invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>{invitation.role.replace('_', ' ')}</TableCell>
                        <TableCell>{getStatusBadge(invitation)}</TableCell>
                        <TableCell>{new Date(invitation.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(invitation.expiresAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};