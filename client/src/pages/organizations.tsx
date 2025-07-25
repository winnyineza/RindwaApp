import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building, Edit, Users, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getOrganizations, createOrganization, updateOrganization, deleteOrganization } from "@/lib/api";

import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { formatDate } from "@/lib/dateUtils";

export default function OrganizationsPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<any>(null);
  const [deletingOrganization, setDeletingOrganization] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Rwanda",
    website: "",
  });

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["/api/organizations"],
    queryFn: getOrganizations,
  });

  const createMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Success",
        description: "Organization created successfully",
      });
      setShowCreateModal(false);
      setFormData({ name: "", type: "", description: "", email: "", phone: "", address: "", city: "", country: "Rwanda", website: "" });
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
    mutationFn: ({ id, data }: { id: string; data: any }) => updateOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Success",
        description: "Organization updated successfully",
      });
      setShowEditModal(false);
      setEditingOrganization(null);
      setFormData({ name: "", type: "", description: "", email: "", phone: "", address: "", city: "", country: "Rwanda", website: "" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Success",
        description: "Organization deleted successfully",
      });
      setShowDeleteModal(false);
      setDeletingOrganization(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.name || !formData.type || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.country) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields marked with *",
        variant: "destructive",
      });
      return;
    }

    if (editingOrganization) {
      updateMutation.mutate({ id: editingOrganization.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleClose = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingOrganization(null);
    setFormData({ name: "", type: "", description: "", email: "", phone: "", address: "", city: "", country: "Rwanda", website: "" });
  };

  const handleEdit = (organization: any) => {
    setEditingOrganization(organization);
    setFormData({
      name: organization.name,
      type: organization.type,
      description: organization.description || "",
      email: organization.email || "",
      phone: organization.phone || "",
      address: organization.address || "",
      city: organization.city || "",
      country: organization.country || "Rwanda",
      website: organization.website || "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (organization: any) => {
    setDeletingOrganization(organization);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deletingOrganization) {
      deleteMutation.mutate(deletingOrganization.id);
    }
  };

  const filteredOrganizations = organizations?.filter((org: any) => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || org.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <DashboardLayout title={t('organizations')} subtitle={t('manageOrganizations')}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">{t('allOrganizations')}</h3>
            <p className="text-sm text-muted-foreground">{t('manageOrganizations')}</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" />
            {t('newOrganization')}
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="POLICE">Police</SelectItem>
              <SelectItem value="FIRE">Fire</SelectItem>
              <SelectItem value="MEDICAL">Medical</SelectItem>
              <SelectItem value="DISASTER_MANAGEMENT">Disaster Management</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Building className="w-5 h-5 text-blue-400" />
              <span>Organizations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizations?.map((org: any) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium text-white">{org.name}</TableCell>
                                        <TableCell>{org.type}</TableCell>
                  <TableCell>{org.description || "No description"}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
                      </TableCell>
                                              <TableCell>
                        {formatDate(org.createdAt || org.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            title="Edit organization"
                            onClick={() => handleEdit(org)}
                            className="hover:bg-accent"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            title="Delete organization"
                            onClick={() => handleDelete(org)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {filteredOrganizations?.length === 0 && organizations?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No organizations found. Create your first organization.
              </div>
            )}
            {filteredOrganizations?.length === 0 && organizations?.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No organizations match your search criteria.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal || showEditModal} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOrganization ? "Edit Organization" : "Create New Organization"}
            </DialogTitle>
            <DialogDescription>
              {editingOrganization 
                ? "Update the organization information below."
                : "Create a new emergency service organization to manage stations and staff."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Organization Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Rwanda National Police"
                  required
                />
              </div>
              
              <div>
                <Label>Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POLICE">Police</SelectItem>
                    <SelectItem value="FIRE">Fire</SelectItem>
                    <SelectItem value="MEDICAL">Medical</SelectItem>
                    <SelectItem value="DISASTER_MANAGEMENT">Disaster Management</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@organization.gov.rw"
                  required
                />
              </div>
              
              <div>
                <Label>Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+250 788 123 456"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g., Kigali, Rwanda"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>City *</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g., Kigali"
                  required
                />
              </div>
              
              <div>
                <Label>Country *</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="e.g., Rwanda"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Website</Label>
              <Input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://organization.gov.rw"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the organization"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.type || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.country || createMutation.isPending || updateMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {editingOrganization 
                ? (updateMutation.isPending ? "Updating..." : "Update Organization")
                : (createMutation.isPending ? "Creating..." : "Create Organization")
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingOrganization?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
