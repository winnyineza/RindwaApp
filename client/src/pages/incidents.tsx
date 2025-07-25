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
    <DashboardLayout title="Dashboard" subtitle="Welcome to Rindwa Admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Incidents Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage emergency incidents</p>
      </div>
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
