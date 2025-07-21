import React, { useCallback, useState } from 'react';
import { GoogleMap, useJSApiLoader, Marker } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Navigation } from 'lucide-react';

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number; address: string };
  height?: string;
}

const containerStyle = {
  width: '100%',
  height: '300px'
};

const defaultCenter = {
  lat: -1.9441, // Kigali, Rwanda
  lng: 30.0619
};

export default function LocationPicker({ 
  onLocationSelect, 
  initialLocation,
  height = '300px' 
}: LocationPickerProps) {
  const { isLoaded } = useJSApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places']
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation || defaultCenter
  );
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [searchAddress, setSearchAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setSelectedLocation(location);
          map?.panTo(location);
          reverseGeocode(location);
        },
        (error) => {
          console.error('Error getting current location:', error);
        }
      );
    }
  };

  const reverseGeocode = async (location: { lat: number; lng: number }) => {
    if (!isLoaded) return;
    
    setIsGeocoding(true);
    const geocoder = new google.maps.Geocoder();
    
    try {
      const response = await geocoder.geocode({
        location: location
      });
      
      if (response.results[0]) {
        const addressStr = response.results[0].formatted_address;
        setAddress(addressStr);
        onLocationSelect({
          ...location,
          address: addressStr
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const searchLocation = async () => {
    if (!searchAddress.trim() || !isLoaded) return;
    
    setIsGeocoding(true);
    const geocoder = new google.maps.Geocoder();
    
    try {
      const response = await geocoder.geocode({
        address: searchAddress
      });
      
      if (response.results[0]) {
        const location = response.results[0].geometry.location;
        const locationObj = {
          lat: location.lat(),
          lng: location.lng()
        };
        
        setSelectedLocation(locationObj);
        setAddress(response.results[0].formatted_address);
        map?.panTo(locationObj);
        map?.setZoom(15);
        
        onLocationSelect({
          ...locationObj,
          address: response.results[0].formatted_address
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const onMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const location = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      setSelectedLocation(location);
      reverseGeocode(location);
    }
  };

  if (!isLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Select Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Select Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Controls */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search for an address..."
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
              />
            </div>
            <Button 
              onClick={searchLocation} 
              disabled={isGeocoding}
              variant="outline"
              size="sm"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button 
              onClick={getCurrentLocation}
              variant="outline"
              size="sm"
              title="Use current location"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
          
          {address && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <Label className="text-xs font-medium">Selected Address:</Label>
              <p>{address}</p>
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ height }}>
          <GoogleMap
            mapContainerStyle={{ ...containerStyle, height: '100%' }}
            center={selectedLocation}
            zoom={initialLocation ? 15 : 12}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onClick={onMapClick}
            options={{
              zoomControl: true,
              mapTypeControl: false,
              scaleControl: true,
              streetViewControl: false,
              rotateControl: false,
              fullscreenControl: false,
            }}
          >
            <Marker
              position={selectedLocation}
              draggable={true}
              onDragEnd={(event) => {
                if (event.latLng) {
                  const location = {
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng()
                  };
                  setSelectedLocation(location);
                  reverseGeocode(location);
                }
              }}
            />
          </GoogleMap>
        </div>

        <p className="text-xs text-gray-500">
          Click on the map or drag the marker to select a location. Use the search box to find a specific address.
        </p>
      </CardContent>
    </Card>
  );
}