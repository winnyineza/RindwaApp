import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Edit, Camera, Mail, Phone, MapPin, Calendar, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ImageCropper } from "@/components/ui/image-cropper";
import { formatDate } from "@/lib/dateUtils";

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  
  // Fetch complete user profile data
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/profile'],
    enabled: !!authUser,
    refetchOnWindowFocus: false
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  // Update form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  const uploadPictureMutation = useMutation({
    mutationFn: async (file: File) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Data = reader.result as string;
            const response = await apiRequest('/api/profile/picture', {
              method: 'POST',
              body: JSON.stringify({
                file: base64Data,
                fileName: file.name,
                fileType: file.type
              })
            });
            resolve(response);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    onSuccess: () => {
      toast({
        title: "Picture updated",
        description: "Your profile picture has been updated successfully.",
      });
      setShowPictureModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile picture",
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowCropper(true);
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    setSelectedFile(croppedFile);
    setShowCropper(false);
    uploadPictureMutation.mutate(croppedFile);
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handlePictureUpload = () => {
    if (selectedFile) {
      uploadPictureMutation.mutate(selectedFile);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      main_admin: "bg-purple-100 text-purple-800",
      super_admin: "bg-blue-100 text-blue-800",
      station_admin: "bg-green-100 text-green-800",
      station_staff: "bg-yellow-100 text-yellow-800",
      citizen: "bg-gray-100 text-gray-800",
    };
    
    return (
      <Badge className={roleColors[role as keyof typeof roleColors]}>
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Profile" subtitle="Manage your account settings">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading profile...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Profile" subtitle="Manage your account settings">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user?.profilePicture} alt="Profile" />
                  <AvatarFallback className="text-lg">
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 rounded-full p-2 h-8 w-8"
                  onClick={() => setShowPictureModal(true)}
                >
                  <Camera className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{user?.firstName} {user?.lastName}</h2>
                <p className="text-gray-600 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  {getRoleBadge(user?.role || '')}
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    Member since {formatDate(user?.createdAt)}
                  </div>
                </div>
              </div>
              <Button onClick={() => setShowEditModal(true)} className="ml-auto">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                <p className="text-lg">{user?.firstName} {user?.lastName}</p>
              </div>
              <Separator />
              <div>
                <Label className="text-sm font-medium text-gray-600">Email Address</Label>
                <p className="text-lg flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
              </div>
              <Separator />
              <div>
                <Label className="text-sm font-medium text-gray-600">Phone Number</Label>
                <p className="text-lg flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {user?.phone || "Not provided"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Role</Label>
                <div className="mt-1">
                  {getRoleBadge(user?.role || '')}
                </div>
              </div>
              <Separator />
              {/* Only show organization and station for non-main admin users */}
              {user?.role !== 'main_admin' && (
                <>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Organization</Label>
                    <p className="text-lg">{user?.organizationName || "Not assigned"}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Station</Label>
                    <p className="text-lg">{user?.stationName || "Not assigned"}</p>
                  </div>
                  <Separator />
                </>
              )}
              <div>
                <Label className="text-sm font-medium text-gray-600">Status</Label>
                <Badge className={user?.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {user?.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Statistics - Only show for operational roles */}
        {user?.role !== 'main_admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Account Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <p className="text-sm text-gray-600">Incidents Handled</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <p className="text-sm text-gray-600">Tasks Completed</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <p className="text-sm text-gray-600">Hours Logged</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+250 XXX XXX XXX"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Profile Picture Modal */}
      <Dialog open={showPictureModal} onOpenChange={setShowPictureModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <Avatar className="w-32 h-32">
                <AvatarImage src={previewUrl || user?.profilePicture} alt="Profile" />
                <AvatarFallback className="text-2xl">
                  {getInitials(user?.firstName, user?.lastName)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <Label htmlFor="profilePicture">Choose Picture</Label>
              <Input
                id="profilePicture"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
              />
              <p className="text-sm text-gray-500 mt-1">
                Selected image will be cropped to fit a square profile picture
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowPictureModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropper
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        onCrop={handleCropComplete}
        imageFile={selectedFile}
        aspectRatio={1}
      />
    </DashboardLayout>
  );
}