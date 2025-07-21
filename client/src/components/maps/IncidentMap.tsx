import React from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertTriangle, Clock, User } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface Incident {
  id: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  reportedAt: string;
  organizationName?: string;
  stationName?: string;
  assignedToName?: string;
}

interface IncidentMapProps {
  incidents: Incident[];
  height?: string;
  showControls?: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: -1.9441, // Kigali, Rwanda
  lng: 30.0619,
};

const priorityColors = {
  critical: '#dc2626', // red-600
  high: '#ea580c',     // orange-600
  medium: '#ca8a04',   // yellow-600
  low: '#16a34a',      // green-600
};

const statusBadgeVariants = {
  pending: 'destructive',
  assigned: 'secondary',
  in_progress: 'default',
  resolved: 'outline',
  escalated: 'destructive',
} as const;

export const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  height = '400px',
  showControls = true,
}) => {
  const [selectedIncident, setSelectedIncident] = React.useState<Incident | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  const validIncidents = incidents.filter(
    (incident) => incident.locationLat && incident.locationLng
  );

  // Debug logging
  console.log('All incidents:', incidents.length);
  console.log('Valid incidents with coordinates:', validIncidents.length);
  console.log('Sample incident:', incidents[0]);
  console.log('Valid incidents:', validIncidents);

  const mapOptions = {
    disableDefaultUI: !showControls,
    zoomControl: showControls,
    streetViewControl: showControls,
    mapTypeControl: showControls,
    fullscreenControl: showControls,
  };

  const handleMarkerClick = (incident: Incident) => {
    setSelectedIncident(incident);
  };

  const handleInfoWindowClose = () => {
    setSelectedIncident(null);
  };

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <Card style={{ height }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Incident Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">Google Maps API key not configured</p>
              <p className="text-sm text-gray-500 mt-1">Please contact your administrator</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (validIncidents.length === 0) {
    return (
      <Card style={{ height }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Incident Locations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">No incidents with location data</p>
              <p className="text-sm text-gray-500 mt-1">Incidents will appear here once reported</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ height }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Incident Locations ({validIncidents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div style={{ height: `calc(${height} - 80px)` }}>
          <LoadScript
            googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
            onLoad={() => setIsLoaded(true)}
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={12}
              options={mapOptions}
            >
              {isLoaded &&
                validIncidents.map((incident) => (
                  <Marker
                    key={incident.id}
                    position={{
                      lat: incident.locationLat!,
                      lng: incident.locationLng!,
                    }}
                    onClick={() => handleMarkerClick(incident)}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 8,
                      fillColor: priorityColors[incident.priority],
                      fillOpacity: 0.8,
                      strokeColor: '#ffffff',
                      strokeWeight: 2,
                    }}
                  />
                ))}

              {selectedIncident && (
                <InfoWindow
                  position={{
                    lat: selectedIncident.locationLat!,
                    lng: selectedIncident.locationLng!,
                  }}
                  onCloseClick={handleInfoWindowClose}
                >
                  <div className="p-2 max-w-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {selectedIncident.title}
                      </h3>
                      <Badge
                        variant={
                          statusBadgeVariants[
                            selectedIncident.status as keyof typeof statusBadgeVariants
                          ] || 'secondary'
                        }
                        className="text-xs"
                      >
                        {selectedIncident.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="capitalize">{selectedIncident.priority} Priority</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{selectedIncident.locationAddress || 'Location coordinates available'}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(selectedIncident.reportedAt)}</span>
                      </div>

                      {selectedIncident.assignedToName && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Assigned to {selectedIncident.assignedToName}</span>
                        </div>
                      )}

                      {selectedIncident.organizationName && (
                        <div className="text-xs text-gray-500">
                          {selectedIncident.organizationName}
                          {selectedIncident.stationName && ` - ${selectedIncident.stationName}`}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-700 mt-2 line-clamp-2">
                      {selectedIncident.description}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncidentMap;