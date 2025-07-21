import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { IncidentTable } from "@/components/dashboard/IncidentTable";
import { IncidentMap } from "@/components/maps/IncidentMap";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function IncidentsPage() {
  const { data: incidents = [] } = useQuery({
    queryKey: ["/api/incidents"],
  });

  return (
    <DashboardLayout title="Incidents" subtitle="Manage emergency incidents">
      <StatsCards />
      
      <Tabs defaultValue="table" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="table">Incidents Table</TabsTrigger>
          <TabsTrigger value="map">Location Map</TabsTrigger>
        </TabsList>
        
        <TabsContent value="table" className="mt-6">
          <IncidentTable />
        </TabsContent>
        
        <TabsContent value="map" className="mt-6">
          <IncidentMap incidents={incidents} height="500px" />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
