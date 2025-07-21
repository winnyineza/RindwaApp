import { useQuery } from "@tanstack/react-query";
import { IncidentMap } from "@/components/maps/IncidentMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, AlertTriangle } from "lucide-react";

export default function IncidentMapWidget() {
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["/api/incidents"],
  });

  const recentIncidents = incidents
    .filter((incident: any) => incident.locationLat && incident.locationLng)
    .slice(0, 10); // Show last 10 incidents with location data

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Recent Incident Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading incidents...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentIncidents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Recent Incident Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">No recent incidents with location data</p>
              <p className="text-sm text-gray-500 mt-1">Incidents will appear here once reported</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <IncidentMap 
      incidents={recentIncidents} 
      height="300px" 
      showControls={false}
    />
  );
}