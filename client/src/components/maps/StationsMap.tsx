import React, { useCallback, useMemo, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, AlertTriangle, Phone, MapPin, Navigation, Eye, Edit } from "lucide-react";

// Define libraries outside component to prevent re-renders
const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

// Kigali center as default
const center = {
  lat: -1.9441,
  lng: 30.0619
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: true,
  rotateControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }]
    }
  ]
};

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
  isActive?: boolean;
  address?: string;
  latitude?: number;
  longitude?: number;
  equipmentLevel?: 'basic' | 'intermediate' | 'advanced';
  performanceScore?: number;
  responseTime?: number;
  utilizationRate?: number;
}

interface StationsMapProps {
  stations: Station[];
  onStationSelect?: (station: Station) => void;
  onStationEdit?: (station: Station) => void;
  selectedStationId?: number;
  height?: string;
}

const StationsMap: React.FC<StationsMapProps> = ({
  stations,
  onStationSelect,
  onStationEdit,
  selectedStationId,
  height = '600px'
}) => {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  // Process stations with valid coordinates
  const validStations = useMemo(() => {
    return stations.filter(station => 
      station.latitude && 
      station.longitude && 
      !isNaN(station.latitude) && 
      !isNaN(station.longitude)
    ).map(station => ({
      ...station,
      position: {
        lat: station.latitude!,
        lng: station.longitude!
      }
    }));
  }, [stations]);

  // Custom marker icons based on station status and type
  const getMarkerIcon = useCallback((station: Station) => {
    let color = '#10b981'; // Default green for active stations
    
    if (station.isActive === false) {
      color = '#6b7280'; // Gray for inactive
    } else if ((station.activeIncidents || 0) > 0) {
      color = '#f59e0b'; // Orange for stations with active incidents
    } else if ((station.activeIncidents || 0) > 5) {
      color = '#ef4444'; // Red for high incident stations
    }

    // Create custom marker based on organization type
    const getIconPath = () => {
      switch (station.organizationType?.toLowerCase()) {
        case 'health':
          return 'M12 2L13.09 8.26L22 9L13.09 15.74L12 22L10.91 15.74L2 9L10.91 8.26L12 2Z';
        case 'police':
          return 'M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.82L5.82 21L7 14L2 9L8.91 8.26L12 2Z';
        case 'fire':
          return 'M12 2C8 2 5 5 5 9C5 11.38 6.19 13.47 8 14.74V17C8 18.1 8.9 19 10 19H14C15.1 19 16 18.1 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5 16 2 12 2Z';
        default:
          return 'M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2Z';
      }
    };

    return {
      path: getIconPath(),
      fillColor: color,
      fillOpacity: 0.8,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 1.5,
    };
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    
    // Fit bounds to show all stations
    if (validStations.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      validStations.forEach(station => {
        bounds.extend(station.position);
      });
      map.fitBounds(bounds);
    }
  }, [validStations]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = (station: Station) => {
    setSelectedStation(station);
    onStationSelect?.(station);
  };

  const handleInfoWindowClose = () => {
    setSelectedStation(null);
  };

  const getPerformanceColor = (score: number = 75) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-blue-600 bg-blue-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600 bg-red-100';
    if (rate >= 70) return 'text-green-600 bg-green-100';
    if (rate >= 40) return 'text-blue-600 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">Failed to load Google Maps</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your API key configuration
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={{ ...mapContainerStyle, height }}
        center={center}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {validStations.map((station) => (
          <Marker
            key={station.id}
            position={station.position}
            icon={getMarkerIcon(station)}
            onClick={() => handleMarkerClick(station)}
            title={station.name}
          />
        ))}

        {selectedStation && (
          <InfoWindow
            position={validStations.find(s => s.id === selectedStation.id)?.position || center}
            onCloseClick={handleInfoWindowClose}
            options={{
              pixelOffset: new window.google.maps.Size(0, -40),
              maxWidth: 400
            }}
          >
            <Card className="border-0 shadow-none max-w-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectedStation.isActive !== false ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Building2 className={`h-4 w-4 ${
                        selectedStation.isActive !== false ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{selectedStation.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{selectedStation.organizationName}</p>
                    </div>
                  </div>
                  <Badge
                    variant={selectedStation.isActive !== false ? "default" : "secondary"}
                    className={selectedStation.isActive !== false ? "bg-green-100 text-green-800" : ""}
                  >
                    {selectedStation.isActive !== false ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Location Info */}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedStation.district && selectedStation.sector
                      ? `${selectedStation.district}, ${selectedStation.sector}`
                      : selectedStation.address || 'Location not specified'
                    }
                  </span>
                </div>

                {/* Contact Info */}
                {selectedStation.contactNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedStation.contactNumber}</span>
                  </div>
                )}

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Staff Capacity</div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {selectedStation.currentStaff || 0} / {selectedStation.capacity || 0}
                      </span>
                    </div>
                    {selectedStation.capacity && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getUtilizationColor(
                          (selectedStation.currentStaff || 0) / selectedStation.capacity * 100
                        )}`}
                      >
                        {Math.round((selectedStation.currentStaff || 0) / selectedStation.capacity * 100)}% utilized
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Performance</div>
                    <div className="text-sm font-medium">{selectedStation.performanceScore || 75}%</div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getPerformanceColor(selectedStation.performanceScore || 75)}`}
                    >
                      {selectedStation.performanceScore && selectedStation.performanceScore >= 90 ? 'Excellent' :
                       selectedStation.performanceScore && selectedStation.performanceScore >= 75 ? 'Good' :
                       selectedStation.performanceScore && selectedStation.performanceScore >= 50 ? 'Fair' : 'Poor'}
                    </Badge>
                  </div>
                </div>

                {/* Active Incidents Alert */}
                {selectedStation.activeIncidents && selectedStation.activeIncidents > 0 && (
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">Active Incidents</span>
                    </div>
                    <Badge variant="destructive">{selectedStation.activeIncidents}</Badge>
                  </div>
                )}

                {/* Equipment Level */}
                {selectedStation.equipmentLevel && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Equipment Level</div>
                    <Badge 
                      variant="outline"
                      className={
                        selectedStation.equipmentLevel === 'advanced' ? 'text-green-600 bg-green-100' :
                        selectedStation.equipmentLevel === 'intermediate' ? 'text-blue-600 bg-blue-100' :
                        'text-gray-600 bg-gray-100'
                      }
                    >
                      {selectedStation.equipmentLevel.charAt(0).toUpperCase() + selectedStation.equipmentLevel.slice(1)}
                    </Badge>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => onStationSelect?.(selectedStation)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  {onStationEdit && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => onStationEdit(selectedStation)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      if (selectedStation.latitude && selectedStation.longitude) {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStation.latitude},${selectedStation.longitude}`;
                        window.open(url, '_blank');
                      }
                    }}
                  >
                    <Navigation className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Map Legend */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 border">
        <h4 className="font-medium text-sm mb-2">Station Status</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs">Active & Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs">Active Incidents</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs">High Incidents</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span className="text-xs">Inactive</span>
          </div>
        </div>
      </div>

      {/* Stats Overlay */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 border">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{validStations.length}</span>
            <span className="text-muted-foreground">stations</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="font-medium">
              {validStations.reduce((sum, s) => sum + (s.activeIncidents || 0), 0)}
            </span>
            <span className="text-muted-foreground">incidents</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-green-600" />
            <span className="font-medium">
              {validStations.reduce((sum, s) => sum + (s.currentStaff || 0), 0)}
            </span>
            <span className="text-muted-foreground">staff</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationsMap; 