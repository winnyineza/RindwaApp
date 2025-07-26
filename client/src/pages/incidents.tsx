import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { IncidentTable } from "@/components/dashboard/IncidentTable";
import { IncidentMap } from "@/components/maps/IncidentMap";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Incident } from "@/types";
import { getIncidents } from "@/lib/api";

export default function IncidentsPage() {
  const { user, loading: authLoading } = useAuth();
  
  const { data: incidents = [], isLoading: incidentsLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    queryFn: getIncidents,
    enabled: !authLoading && !!user, // Only run query when user is authenticated
  });

  // Calculate stats from incidents data
  const stats = useMemo(() => {
    if (!incidents || incidents.length === 0) {
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        resolved: 0
      };
    }

    return {
      total: incidents.length,
      pending: incidents.filter(incident => 
        incident.status === 'reported' || incident.status === 'assigned'
      ).length,
      inProgress: incidents.filter(incident => 
        incident.status === 'in_progress'
      ).length,
      resolved: incidents.filter(incident => 
        incident.status === 'resolved'
      ).length
    };
  }, [incidents]);

  const isLoading = authLoading || incidentsLoading;

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome to Rindwa Admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Incidents Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage emergency incidents</p>
      </div>
      <StatsCards stats={stats} isLoading={isLoading} />
      
      <Tabs defaultValue="table" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="table">Incidents Table</TabsTrigger>
          <TabsTrigger value="map">Location Map</TabsTrigger>
        </TabsList>
        
        <TabsContent value="table" className="mt-6">
          <IncidentTable />
        </TabsContent>
        
        <TabsContent value="map" className="mt-6">
          <IncidentMap incidents={incidents as any} height="500px" />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
