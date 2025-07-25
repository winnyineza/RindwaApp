import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { setStoredToken } from "@/lib/auth";

interface InvitationData {
  id: number;
  email: string;
  role: string;
  organisationId?: string; // UUID string, British spelling
  stationId?: number;
  token: string;
  expiresAt: string;
  organizationName?: string;
  stationName?: string;
}

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  
  const [error, setError] = useState<string>("");

  const { data: invitation, isLoading, error: invitationError } = useQuery<InvitationData>({
    queryKey: [`/api/invitations/${token}`],
    queryFn: async () => {
      const response = await apiRequest(`/api/invitations/${token}`);
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest(`/api/invitations/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (response: any) => {
      toast({
        title: "Account created successfully",
        description: "Welcome to Rindwa Emergency Management Platform!",
      });
      setStoredToken(response.token);
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      setError(error.message || "Failed to accept invitation");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    acceptInvitationMutation.mutate(formData);
  };

  const getRoleBadge = (role: string | undefined) => {
    if (!role) return <Badge variant="secondary">Unknown Role</Badge>;
    
    const roleConfig = {
      super_admin: { variant: "default" as const, label: "Super Admin" },
      main_admin: { variant: "destructive" as const, label: "Main Admin" },
      station_admin: { variant: "secondary" as const, label: "Station Admin" },
      station_staff: { variant: "outline" as const, label: "Station Staff" },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || { variant: "secondary" as const, label: role.replace('_', ' ') };
    
    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (invitationError || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              This invitation link is invalid, expired, or has already been used.
            </p>
            <Button onClick={() => setLocation("/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Complete Your Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Invitation Details</h3>
            <div className="space-y-2 text-sm">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{invitation.email}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground">Role:</span>
                {getRoleBadge(invitation.role)}
              </p>
              {invitation.organizationName && (
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Organization:</span>
                  <span className="font-medium">{invitation.organizationName}</span>
                </p>
              )}
              {invitation.stationName && (
                <p className="flex items-center justify-between">
                  <span className="text-muted-foreground">Station:</span>
                  <span className="font-medium">{invitation.stationName}</span>
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Enter your first name"
                  required
                  className="focus-visible:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Enter your last name"
                  required
                  className="focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter your phone number"
                required
                className="focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create a password"
                required
                className="focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm your password"
                required
                className="focus-visible:ring-primary"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={acceptInvitationMutation.isPending}
            >
              {acceptInvitationMutation.isPending ? "Creating Account..." : "Accept Invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}