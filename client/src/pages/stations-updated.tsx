import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, Edit } from "lucide-react";
import { getStations, createStation, updateStation } from "@/lib/api";
import { Station } from "@/types";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ComprehensiveLocationPicker from "@/components/maps/ComprehensiveLocationPicker";
import { formatDate } from "@/lib/dateUtils";

// Rwanda Districts and their Sectors mapping
const DISTRICT_SECTORS_MAP: Record<string, string[]> = {
  // Kigali City
  "Gasabo": ["Bumbogo", "Gatsata", "Gikomero", "Gisozi", "Jabana", "Jali", "Kacyiru", "Kimihurura", "Kimisagara", "Kinyinya", "Ndera", "Nduba", "Remera", "Rusororo", "Rutunga"],
  "Kicukiro": ["Gahanga", "Gatenga", "Kagarama", "Kanombe", "Kicukiro", "Kigarama", "Masaka", "Niboye", "Nyarugunga", "Rujugiro"],
  "Nyarugenge": ["Gitega", "Kanyinya", "Kigali", "Kimisagara", "Mageragere", "Muhima", "Nyakabanda", "Nyamirambo", "Nyarugenge", "Rwezamenyo"],
  
  // Eastern Province
  "Bugesera": ["Gashora", "Juru", "Kamabuye", "Mareba", "Mayange", "Musenyi", "Mwogo", "Nemba", "Ngeruka", "Ntarama", "Nyamata", "Nyarugenge", "Rilima", "Ruhuha", "Rweru", "Shyara"],
  "Gatsibo": ["Gasange", "Gatsibo", "Gitoki", "Kageyo", "Kiramuruzi", "Kiziguro", "Murambi", "Ngarama", "Nyagihanga", "Remera", "Rugarama", "Rwimbogo"],
  "Kayonza": ["Gahini", "Kabare", "Kabarondo", "Mukarange", "Murama", "Murundi", "Ndego", "Nyamirama", "Rukara", "Ruramira", "Rwinkwavu"],
  "Kirehe": ["Gatore", "Kigarama", "Kigina", "Kirehe", "Mahama", "Mpanga", "Musaza", "Nasho", "Nyamugali", "Nyarubuye"],
  "Ngoma": ["Gashanda", "Jarama", "Karembo", "Kazo", "Mugesera", "Murama", "Remera", "Rukira", "Rukumberi", "Sake", "Zaza"],
  "Nyagatare": ["Gatunda", "Karangazi", "Katabagemu", "Kiyombe", "Matimba", "Mimuri", "Musheli", "Nyagatare", "Rukomo", "Rwempasha", "Rwimiyaga", "Tabagwe"],
  "Rwamagana": ["Fumbwe", "Gahengeri", "Gishari", "Karenge", "Kigabiro", "Muhazi", "Munyaga", "Munyiginya", "Musha", "Muyumbu", "Mwulire", "Nzige", "Rubona", "Rurenge"],
  
  // Northern Province
  "Burera": ["Bungwe", "Butaro", "Cyanika", "Cyeru", "Gahunga", "Gatebe", "Gitovu", "Kagogo", "Kinoni", "Kinyababa", "Nemba", "Rugarama", "Rugendabari", "Ruhunde", "Rusarabuye", "Rwerere"],
  "Gakenke": ["Busengo", "Coko", "Cyabingo", "Gakenke", "Gashenyi", "Mugunga", "Janja", "Kamubuga", "Karambo", "Kivuruga", "Mataba", "Minazi", "Muhondo", "Muyongwe", "Nemba", "Ruli", "Rusasa", "Rushashi"],
  "Gicumbi": ["Bukure", "Bwisige", "Byumba", "Cyumba", "Gicumbi", "Kaniga", "Manyagiro", "Miyove", "Kageyo", "Mukarange", "Muko", "Mutete", "Nyamiyaga", "Nyankenke", "Rubaya", "Rukomo", "Rushaki", "Rutare", "Ruvune", "Rwamiko", "Shangasha"],
  "Musanze": ["Busogo", "Cyuve", "Gacaca", "Gashaki", "Gataraga", "Kimonyi", "Kinigi", "Muhoza", "Muko", "Musanze", "Nkotsi", "Nyange", "Remera", "Rwaza", "Shingiro"],
  "Rulindo": ["Base", "Burega", "Bushoki", "Buyoga", "Cyinzuzi", "Cyungo", "Kinihira", "Kisaro", "Mbogo", "Murambi", "Ngoma", "Ntarabana", "Rukozo", "Rusiga", "Shyorongi", "Tumba"],
  
  // Southern Province
  "Gisagara": ["Gikonko", "Gishubi", "Kansi", "Kaziba", "Kibirizi", "Kibumbwe", "Muganza", "Mukindo", "Musha", "Ndora", "Nyanza", "Save"],
  "Huye": ["Gishamvu", "Huye", "Karama", "Kigoma", "Kinazi", "Maraba", "Mbazi", "Mukura", "Ngoma", "Rsama", "Ruhashya", "Rusatira", "Rwaniro", "Simbi", "Tumba"],
  "Kamonyi": ["Gacurabwenge", "Karama", "Kayenzi", "Kayumbu", "Mugina", "Musambira", "Nyamiyaga", "Nyarubaka", "Runda", "Ruzo"],
  "Muhanga": ["Cyeza", "Kabacuzi", "Kibangu", "Kiyumba", "Muhanga", "Mukura", "Mushishiro", "Nyabinoni", "Nyamabuye", "Nyamiyaga", "Rongi", "Rugendabari"],
  "Nyamagabe": ["Buruhukiro", "Cyanika", "Gatare", "Kaduha", "Kamegeri", "Kibirizi", "Kibumbwe", "Kitongo", "Mbazi", "Munini", "Musebeya", "Mushubi", "Nkomane", "Tare", "Uwinkingi"],
  "Nyanza": ["Busasamana", "Busoro", "Cyabakamyi", "Kibirizi", "Kigoma", "Mukingo", "Ntyazo", "Nyagisozi", "Rwabicuma"],
  "Ruhango": ["Bweramana", "Byimana", "Kabagali", "Kinazi", "Kinihira", "Muhanga", "Muyira", "Ntongwe", "Ruhango"],
  
  // Western Province
  "Karongi": ["Bwishyura", "Gashari", "Gishyita", "Gitesi", "Murambi", "Mutuntu", "Rugabano", "Ruganda", "Rurimbi"],
  "Ngororero": ["Bwira", "Gatumba", "Hindiro", "Kabaya", "Kageyo", "Matyazo", "Muhororo", "Muhanda", "Ndaro", "Ngororero", "Nyange", "Sovu"],
  "Nyabihu": ["Bigogwe", "Jenda", "Jomba", "Kabatwa", "Karago", "Kintobo", "Mukamira", "Rambura", "Rurembo", "Shyira"],
  "Rubavu": ["Bugeshi", "Busasamana", "Cyanzarwe", "Gisenyi", "Kageyo", "Kanama", "Mudende", "Nyagisagara", "Nyakiliba", "Nyamyumba", "Rubavu", "Rugerero"],
  "Rusizi": ["Butare", "Bugarama", "Gitambi", "Giheke", "Gihundwe", "Hirwa", "Kamembe", "Muganza", "Nkanka", "Nkungu", "Nyakabuye", "Nyakarenzo", "Rwimbogo"],
  "Rutsiro": ["Boneza", "Gihango", "Kigeyo", "Kivumu", "Manihira", "Mukura", "Musasa", "Mushonyi", "Mushubati", "Nyabirasi", "Ruhango"],
  "Nyaruguru": ["Cyahinda", "Gatare", "Kibeho", "Kibumbwe", "Mata", "Munini", "Ngera", "Ngoma", "Nyabimata", "Nyagisozi", "Ruramba", "Rusenge"]
};

export default function StationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contactNumber: "", // Changed from phone to match backend
    district: "",
    sector: "",
    organisationId: "", // Added required field for backend
    capacity: "", // Added optional field
    latitude: "",
    longitude: "",
  });

  const { data: stations, isLoading } = useQuery<Station[]>({
    queryKey: ["/api/stations", user?.organisationId],
    queryFn: () => getStations(user?.organisationId),
    enabled: !!user?.organisationId,
  });

  // Get available districts
  const availableDistricts = Object.keys(DISTRICT_SECTORS_MAP).sort();

  // Get available sectors based on selected district
  const getAvailableSectors = (district: string): string[] => {
    return district ? (DISTRICT_SECTORS_MAP[district] || []).sort() : [];
  };

  // Handle district change and reset sector
  const handleDistrictChange = (district: string) => {
    setFormData({
      ...formData,
      district,
      sector: "" // Reset sector when district changes
    });
  };

  const createMutation = useMutation({
    mutationFn: createStation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stations"] });
      toast({
        title: "Success",
        description: "Station created successfully",
      });
      setShowCreateModal(false);
      setFormData({ name: "", address: "", contactNumber: "", district: "", sector: "", organisationId: "", capacity: "", latitude: "", longitude: "" });
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
    mutationFn: ({ id, data }: { id: number; data: any }) => updateStation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stations"] });
      toast({
        title: "Success",
        description: "Station updated successfully",
      });
      setShowEditModal(false);
      setEditingStation(null);
      setFormData({ name: "", address: "", contactNumber: "", district: "", sector: "", organisationId: "", capacity: "", latitude: "", longitude: "" });
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
    if (editingStation) {
      updateMutation.mutate({ id: editingStation.id, data: formData });
    } else {
      // Ensure organizationId is populated for station creation
      const stationData = {
        ...formData,
        organizationId: user?.organisationId || formData.organisationId, // Use user's org ID
        // Convert strings to appropriate types
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };
      console.log('Creating station with data:', stationData);
      createMutation.mutate(stationData);
    }
  };

  const handleEdit = (station: Station) => {
    setEditingStation(station);
    setFormData({
      name: station.name,
      address: station.address || "",
      contactNumber: station.phone || "",
      district: station.district || "",
      sector: station.sector || "",
      organisationId: station.organisationId || "",
      capacity: station.capacity?.toString() || "",
      latitude: station.latitude?.toString() || "",
      longitude: station.longitude?.toString() || "",
    });
    setShowEditModal(true);
  };

  const handleLocationSelect = (location: { lat: number; lng: number; address: string; formattedAddress?: string }) => {
    setFormData({
      ...formData,
      latitude: location.lat.toString(),
      longitude: location.lng.toString(),
      address: location.formattedAddress || location.address,
    });
  };

  const handleClose = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingStation(null);
          setFormData({ name: "", address: "", contactNumber: "", district: "", sector: "", organisationId: "", capacity: "", latitude: "", longitude: "" });
  };

  const districts = [
    "Gasabo", "Kicukiro", "Nyarugenge", "Bugesera", "Gatsibo", "Kayonza", 
    "Kirehe", "Ngoma", "Nyagatare", "Rwamagana", "Burera", "Gakenke", 
    "Gicumbi", "Musanze", "Rulindo", "Gisagara", "Huye", "Kamonyi", 
    "Muhanga", "Nyamagabe", "Nyanza", "Ruhango", "Karongi", "Ngororero", 
    "Nyabihu", "Rubavu", "Rusizi", "Rutsiro", "Nyaruguru"
  ];

  const sectors = [
    "Remera", "Nyarutarama", "Kimihurura", "Kacyiru", "Gisozi", "Bumbogo",
    "Gatsata", "Gikomero", "Jali", "Jabana", "Kinyinya", "Ndera", 
    "Nduba", "Rusororo", "Rutunga", "Gaculiro", "Gatenga", "Gikondo",
    "Kagarama", "Kanombe", "Kicukiro", "Kigarama", "Masaka", "Niboye",
    "Nyarugunga", "Rukiri", "Rwampara", "Gitega", "Kigali", "Kimisagara",
    "Mageragere", "Muhima", "Nyakabanda", "Nyamirambo", "Rwezamenyo"
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Stations Management</h1>
            <p className="text-muted-foreground">
              Manage stations within your organization
            </p>
          </div>
          {/* Show create button for admin roles */}
          {(user?.role === 'main_admin' || user?.role === 'super_admin' || user?.role === 'station_admin') && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 whitespace-nowrap"
              size="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Station
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Stations</span>
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
                    <TableHead>Name</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stations?.map((station) => (
                    <TableRow key={station.id}>
                      <TableCell className="font-medium">{station.name}</TableCell>
                      <TableCell>{station.district || "Not specified"}</TableCell>
                      <TableCell>{station.sector || "Not specified"}</TableCell>
                      <TableCell>{station.phone || "No phone"}</TableCell>
                      <TableCell>
                        {formatDate(station.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(station)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {stations?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No stations found. Create your first station.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Station</DialogTitle>
            <DialogDescription>
              Add a new station to your organization with location details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Station Location *</Label>
              <ComprehensiveLocationPicker
                onLocationSelect={handleLocationSelect}
                initialLocation={
                  formData.latitude && formData.longitude ? {
                    lat: parseFloat(formData.latitude),
                    lng: parseFloat(formData.longitude),
                    address: formData.address
                  } : undefined
                }
                placeholder="Search for station location (e.g., Remera Police Station, Kigali)"
              />
            </div>
            <div>
              <Label>Station Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Remera Police Station"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>District *</Label>
                <Select value={formData.district} onValueChange={handleDistrictChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDistricts.map((district) => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sector *</Label>
                <Select 
                  value={formData.sector} 
                  onValueChange={(value) => setFormData({...formData, sector: value})}
                  disabled={!formData.district}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.district ? "Select district first" : "Select sector"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableSectors(formData.district).map((sector) => (
                      <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                placeholder="Station phone number"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.district || !formData.sector || !formData.latitude || !formData.longitude || createMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {createMutation.isPending ? "Creating..." : "Create Station"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Station</DialogTitle>
            <DialogDescription>
              Update station information and location details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Station Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Remera Police Station"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>District *</Label>
                <Select value={formData.district} onValueChange={handleDistrictChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDistricts.map((district) => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sector *</Label>
                <Select 
                  value={formData.sector} 
                  onValueChange={(value) => setFormData({...formData, sector: value})}
                  disabled={!formData.district}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.district ? "Select district first" : "Select sector"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableSectors(formData.district).map((sector) => (
                      <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                placeholder="Station phone number"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.district || updateMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {updateMutation.isPending ? "Updating..." : "Update Station"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}