import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Search, Building2, Users, AlertTriangle, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

interface Station {
  id: number;
  name: string;
  district?: string;
  sector?: string;
  organizationName: string;
  organizationType: string;
  contactNumber?: string;
  capacity?: number;
  currentStaff?: number;
  activeIncidents?: number;
  createdAt: string;
}

export default function StationsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOrg, setFilterOrg] = useState("");

  const { data: stations = [], isLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations/all'],
    enabled: user?.role === 'main_admin' || user?.role === 'super_admin',
  });

  if (!user || (user.role !== 'main_admin' && user.role !== 'super_admin')) {
    return (
      <DashboardLayout title="Unauthorized" subtitle="Access denied">
        <div className="text-center py-8">
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredStations = stations.filter((station: Station) => {
    const matchesSearch = !searchTerm || 
      station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.sector?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOrg = !filterOrg || station.organizationName === filterOrg;
    
    return matchesSearch && matchesOrg;
  });

  const organizations = Array.from(new Set(stations.map((s: Station) => s.organizationName)));
  const totalStations = stations.length;
  const totalActiveIncidents = stations.reduce((sum: number, s: Station) => sum + (s.activeIncidents || 0), 0);

  const getTitle = () => {
    if (user?.role === 'main_admin') {
      return "Stations Overview";
    } else if (user?.role === 'super_admin') {
      return "Station Management";
    }
    return "Stations";
  };

  const getSubtitle = () => {
    if (user?.role === 'main_admin') {
      return `Monitor all stations across organizations.\nTotal: ${totalStations} stations with ${totalActiveIncidents} active incidents`;
    } else if (user?.role === 'super_admin') {
      return `Manage stations for your organization.\nTotal: ${totalStations} stations with ${totalActiveIncidents} active incidents`;
    }
    return `Stations: ${totalStations}`;
  };

  return (
    <DashboardLayout 
      title={getTitle()} 
      subtitle={getSubtitle()}
    >
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStations}</div>
              <p className="text-xs text-muted-foreground">
                Across {organizations.length} organizations
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActiveIncidents}</div>
              <p className="text-xs text-muted-foreground">
                Currently being handled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stations.reduce((sum: number, s: Station) => sum + (s.currentStaff || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Personnel across all stations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organizations.length}</div>
              <p className="text-xs text-muted-foreground">
                Emergency service types
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Station Management
            </CardTitle>
            <CardDescription>
              Search and filter stations across all organizations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search stations, organizations, or locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterOrg === "" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterOrg("")}
                >
                  All Organizations
                </Button>
                {organizations.map((org: string) => (
                  <Button
                    key={org}
                    variant={filterOrg === org ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterOrg(org as string)}
                  >
                    {org as string}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stations Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Stations ({filteredStations.length})</CardTitle>
            <CardDescription>
              Complete overview of all emergency service stations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading stations...</p>
              </div>
            ) : filteredStations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm || filterOrg ? "No stations found matching your criteria." : "No stations available."}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Incidents</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStations.map((station: Station) => (
                      <TableRow key={station.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{station.name}</div>
                              <div className="text-sm text-muted-foreground">ID: {station.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{station.organizationName}</div>
                              <Badge variant="outline" className="text-xs">
                                {station.organizationType}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {station.district && station.sector ? (
                              <>
                                <div className="font-medium">{station.district}</div>
                                <div className="text-muted-foreground">{station.sector}</div>
                              </>
                            ) : (
                              <div className="text-muted-foreground">Not specified</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {station.currentStaff || 0}
                              {station.capacity && ` / ${station.capacity}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {station.activeIncidents || 0}
                            </span>
                            {(station.activeIncidents || 0) > 0 && (
                              <Badge variant="destructive" className="ml-1 text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {station.contactNumber || "Not provided"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(station.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}