import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Search, Navigation, Copy, Map, Globe, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LocationResult {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
  formattedAddress?: string;
}

interface ComprehensiveLocationPickerProps {
  onLocationSelect: (location: LocationResult) => void;
  initialLocation?: { lat: number; lng: number; address?: string };
  placeholder?: string;
}

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

const defaultCenter = { lat: -1.9441, lng: 30.0619 }; // Kigali, Rwanda

export default function ComprehensiveLocationPicker({ 
  onLocationSelect, 
  initialLocation,
  placeholder = "Search for station location (e.g., Remera Police Station, Kigali)"
}: ComprehensiveLocationPickerProps) {
  const { toast } = useToast();
  const mapRef = useRef<google.maps.Map>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(
    initialLocation ? {
      lat: initialLocation.lat,
      lng: initialLocation.lng,
      address: initialLocation.address || ''
    } : null
  );
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState(initialLocation || defaultCenter);
  const [manualLat, setManualLat] = useState(initialLocation?.lat?.toString() || '');
  const [manualLng, setManualLng] = useState(initialLocation?.lng?.toString() || '');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isMapSearching, setIsMapSearching] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-maps-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  // Note: Google Maps API key notification disabled for cleaner UX
  // Users can still use manual coordinate input if needed

  // Known Rwanda locations fallback
  const knownLocations: { [key: string]: LocationResult } = {
    // Kigali City Districts
    'kigali': { lat: -1.9441, lng: 30.0619, address: 'Kigali City Center' },
    'gasabo': { lat: -1.9355, lng: 30.0928, address: 'Gasabo District' },
    'nyarugenge': { lat: -1.9536, lng: 30.0588, address: 'Nyarugenge District' },
    'kicukiro': { lat: -1.9667, lng: 30.1028, address: 'Kicukiro District' },
    'remera': { lat: -1.9355, lng: 30.1135, address: 'Remera, Gasabo' },
    'kimisagara': { lat: -1.9789, lng: 30.0782, address: 'Kimisagara, Nyarugenge' },
    'gikondo': { lat: -1.9897, lng: 30.0878, address: 'Gikondo, Kicukiro' },
    
    // Northern Province
    'musanze': { lat: -1.4994, lng: 29.6352, address: 'Musanze District' },
    'gicumbi': { lat: -1.7000, lng: 30.1167, address: 'Gicumbi District' },
    'rulindo': { lat: -1.7667, lng: 30.0833, address: 'Rulindo District' },
    'gakenke': { lat: -1.6833, lng: 29.7833, address: 'Gakenke District' },
    'burera': { lat: -1.4833, lng: 29.8833, address: 'Burera District' },
    
    // Eastern Province  
    'nyagatare': { lat: -1.2885, lng: 30.3256, address: 'Nyagatare District' },
    'gatsibo': { lat: -1.5833, lng: 30.4167, address: 'Gatsibo District' },
    'kayonza': { lat: -1.8833, lng: 30.6167, address: 'Kayonza District' },
    'kirehe': { lat: -2.0833, lng: 30.7167, address: 'Kirehe District' },
    'ngoma': { lat: -2.1833, lng: 30.5167, address: 'Ngoma District' },
    'bugesera': { lat: -2.2833, lng: 30.2167, address: 'Bugesera District' },
    'rwamagana': { lat: -1.9500, lng: 30.4333, address: 'Rwamagana District' },
    
    // Southern Province
    'huye': { lat: -2.5967, lng: 29.7385, address: 'Huye District' },
    'nyanza': { lat: -2.3500, lng: 29.7500, address: 'Nyanza District' },
    'muhanga': { lat: -2.0833, lng: 29.7500, address: 'Muhanga District' },
    'kamonyi': { lat: -2.0167, lng: 29.8167, address: 'Kamonyi District' },
    'ruhango': { lat: -2.1833, lng: 29.7833, address: 'Ruhango District' },
    'nyamagabe': { lat: -2.5000, lng: 29.4167, address: 'Nyamagabe District' },
    'gisagara': { lat: -2.6167, lng: 29.8333, address: 'Gisagara District' },
    'nyaruguru': { lat: -2.6833, lng: 29.5833, address: 'Nyaruguru District' },
    
    // Western Province
    'rubavu': { lat: -1.6783, lng: 29.2602, address: 'Rubavu District' },
    'nyabihu': { lat: -1.6500, lng: 29.5167, address: 'Nyabihu District' },
    'ngororero': { lat: -1.8167, lng: 29.4167, address: 'Ngororero District' },
    'rusizi': { lat: -2.4833, lng: 28.9000, address: 'Rusizi District' },
    'nyamasheke': { lat: -2.3167, lng: 29.1333, address: 'Nyamasheke District' },
    'karongi': { lat: -2.0000, lng: 29.3833, address: 'Karongi District' },
    'rutsiro': { lat: -1.8833, lng: 29.3167, address: 'Rutsiro District' }
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support location detection",
        variant: "destructive"
      });
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const address = await reverseGeocode(latitude, longitude);
          const location: LocationResult = {
            lat: latitude,
            lng: longitude,
            address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          };
          
          setSelectedLocation(location);
          setMapCenter({ lat: latitude, lng: longitude });
          onLocationSelect(location);
          
          toast({
            title: "✅ Current location detected",
            description: `Found: ${location.address}`
          });
        } catch (error) {
          console.error('Error getting address:', error);
          const location: LocationResult = {
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          };
          setSelectedLocation(location);
          setMapCenter({ lat: latitude, lng: longitude });
          onLocationSelect(location);
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        toast({
          title: "Location access denied",
          description: "Please enable location permissions and try again",
          variant: "destructive"
        });
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    if (!isLoaded || !window.google) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            resolve(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          }
        }
      );
    });
  };

  const searchWithGooglePlaces = useCallback(async (query: string) => {
    if (!isLoaded || !window.google) {
      throw new Error('Google Maps not available');
    }

    const service = new window.google.maps.places.PlacesService(document.createElement('div'));

    return new Promise<LocationResult[]>((resolve, reject) => {
      service.textSearch(
        {
          query: query + ' Rwanda',
          location: new window.google.maps.LatLng(-1.9441, 30.0619),
          radius: 50000,
        },
        (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            const locations: LocationResult[] = results.slice(0, 5).map(place => ({
              lat: place.geometry!.location!.lat(),
              lng: place.geometry!.location!.lng(),
              address: place.name || '',
              formattedAddress: place.formatted_address || '',
              placeId: place.place_id
            }));
            resolve(locations);
          } else {
            reject(new Error('No results found'));
          }
        }
      );
    });
  }, [isLoaded]);

  const searchManualFallback = useCallback(async (query: string): Promise<LocationResult[]> => {
    const queryLower = query.toLowerCase();
    const matches: LocationResult[] = [];

    Object.entries(knownLocations).forEach(([key, location]) => {
      if (key.includes(queryLower) || queryLower.includes(key)) {
        matches.push(location);
      }
    });

    if (matches.length === 0) {
      matches.push(knownLocations.kigali);
    }

    return matches;
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);

    try {
      let results: LocationResult[];
      
      if (isLoaded && !loadError && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        results = await searchWithGooglePlaces(searchQuery);
      } else {
        results = await searchManualFallback(searchQuery);
      }

      setSearchResults(results);
      
      if (results.length === 1) {
        handleLocationSelect(results[0]);
      }
    } catch (error) {
      console.error('Search error:', error);
      const fallbackResults = await searchManualFallback(searchQuery);
      setSearchResults(fallbackResults);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (location: LocationResult) => {
    setSelectedLocation(location);
    setMapCenter({ lat: location.lat, lng: location.lng });
    setSearchResults([]);
    onLocationSelect(location);
    
    toast({
      title: "📍 Location selected",
      description: location.address
    });
  };

  const handleMapClick = async (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      const address = await reverseGeocode(lat, lng);
      const location: LocationResult = {
        lat,
        lng,
        address
      };
      
      handleLocationSelect(location);
    }
  };

  const handleManualInput = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      toast({
        title: "Invalid coordinates",
        description: "Please enter valid latitude and longitude values",
        variant: "destructive"
      });
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({
        title: "Invalid coordinate range",
        description: "Latitude: -90 to 90, Longitude: -180 to 180",
        variant: "destructive"
      });
      return;
    }

    const location: LocationResult = {
      lat,
      lng,
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    };

    handleLocationSelect(location);
  };

  const handleMapSearch = async () => {
    if (!mapSearchQuery.trim()) return;
    
    setIsMapSearching(true);

    try {
      let results: LocationResult[];
      
      if (isLoaded && !loadError && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        // Use Google Maps API for enhanced search
        results = await searchWithGooglePlaces(mapSearchQuery);
      } else {
        // Use manual fallback
        results = await searchManualFallback(mapSearchQuery);
      }

      if (results.length > 0) {
        const firstResult = results[0];
        // Center the map on the search result
        setMapCenter({ lat: firstResult.lat, lng: firstResult.lng });
        
        toast({
          title: "📍 Location found",
          description: `Centered map on ${firstResult.address}. Click to select exact spot.`
        });
      } else {
        toast({
          title: "No results found",
          description: "Try searching for major cities or landmarks in Rwanda",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Map search error:', error);
      toast({
        title: "Search failed",
        description: "Please try a different search term",
        variant: "destructive"
      });
    } finally {
      setIsMapSearching(false);
    }
  };

  const copyCoordinates = () => {
    if (selectedLocation) {
      const coords = `${selectedLocation.lat}, ${selectedLocation.lng}`;
      navigator.clipboard.writeText(coords);
      toast({
        title: "📋 Coordinates copied",
        description: coords
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Station Location Selection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search" className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              Search
            </TabsTrigger>
            <TabsTrigger value="current" className="flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              GPS
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-1">
              <Map className="h-3 w-3" />
              Map
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Manual
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={placeholder}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Select location:</p>
                {searchResults.map((result, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start h-auto p-3"
                    onClick={() => handleLocationSelect(result)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{result.address}</div>
                      {result.formattedAddress && (
                        <div className="text-xs text-gray-500">{result.formattedAddress}</div>
                      )}
                      <div className="text-xs text-blue-600 mt-1">
                        📍 {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Current Location Tab */}
          <TabsContent value="current" className="space-y-4">
            <Button
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="w-full"
              size="lg"
            >
              <Navigation className="h-4 w-4 mr-2" />
              {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
            </Button>
            <p className="text-sm text-gray-600">
              📱 Uses your device's GPS to detect your current position. Make sure you're at the station location.
            </p>
          </TabsContent>

          {/* Interactive Map Tab */}
          <TabsContent value="map" className="space-y-4">
            {/* Map Search */}
            <div className="flex gap-2">
              <Input
                value={mapSearchQuery}
                onChange={(e) => setMapSearchQuery(e.target.value)}
                placeholder="Search for any place in Rwanda (e.g., Nyagatare, Musanze, Huye)"
                onKeyPress={(e) => e.key === 'Enter' && handleMapSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleMapSearch} 
                disabled={isMapSearching || !mapSearchQuery.trim()}
                size="sm"
              >
                {isMapSearching ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {isLoaded && !loadError ? (
              <div className="h-80 w-full border rounded-lg overflow-hidden">
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={15}
                  onLoad={onMapLoad}
                  onClick={handleMapClick}
                  options={{
                    disableDefaultUI: false,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: true,
                    fullscreenControl: false
                  }}
                >
                  {selectedLocation && (
                    <Marker
                      position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                      title={selectedLocation.address}
                    />
                  )}
                </GoogleMap>
              </div>
            ) : (
              <div className="h-80 w-full border rounded-lg overflow-hidden">
                {/* Fallback Map Interface */}
                <div className="h-full w-full bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950 flex flex-col items-center justify-center p-6">
                  <div className="text-center space-y-4">
                    <div className="text-4xl">🗺️</div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      Interactive Map Unavailable
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                      {loadError ? '❌ Map failed to load' : '🔄 Loading map...'}
                      <br />Use the <strong>Search</strong>, <strong>GPS</strong>, or <strong>Manual</strong> tabs for location selection.
                    </p>
                    
                    {/* Quick Rwanda Locations */}
                    <div className="mt-6 space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Quick Select Rwanda Locations:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries({
                          'Kigali Center': { lat: -1.9441, lng: 30.0619 },
                          'Nyagatare': { lat: -1.2885, lng: 30.3256 },
                          'Musanze': { lat: -1.4994, lng: 29.6352 },
                          'Huye': { lat: -2.5967, lng: 29.7385 },
                          'Rubavu': { lat: -1.6783, lng: 29.2602 },
                          'Rwamagana': { lat: -1.9500, lng: 30.4333 }
                        }).map(([name, coords]) => (
                          <Button
                            key={name}
                            variant="outline"
                            size="sm"
                            onClick={() => handleLocationSelect({
                              lat: coords.lat,
                              lng: coords.lng,
                              address: name
                            })}
                            className="text-xs"
                          >
                            📍 {name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600">
              🔍 {isLoaded && !loadError ? 'Search for a place above, then click anywhere on the map to select the exact station location' : 'Use other tabs for location selection while map is unavailable'}
            </p>
          </TabsContent>

          {/* Manual Input Tab */}
          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Latitude</label>
                <Input
                  type="number"
                  step="any"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="-1.9441"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="30.0619"
                />
              </div>
            </div>
            <Button onClick={handleManualInput} className="w-full">
              Set Location
            </Button>
            
            {/* Helper Section */}
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">📍 How to get coordinates:</p>
                <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>1. Open Google Maps in your browser</li>
                  <li>2. Search for your station location</li>
                  <li>3. Right-click on the exact spot</li>
                  <li>4. Click "Copy coordinates"</li>
                  <li>5. Paste values into the fields above</li>
                </ol>
              </div>
              
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://maps.google.com', '_blank')}
                  className="text-xs"
                >
                  <Globe className="h-3 w-3 mr-1" />
                  Open Google Maps
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 space-y-1">
                <p><strong>Rwanda Examples:</strong></p>
                <p>• Kigali Center: -1.9441, 30.0619</p>
                <p>• Gasabo District: -1.9355, 30.0928</p>
                <p>• Remera: -1.9355, 30.1135</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Selected Location Display */}
        {selectedLocation && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-200">
                  ✅ Location Selected
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  {selectedLocation.address}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  📍 {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyCoordinates}
                className="ml-2"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* API Status */}
        {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 For enhanced search and map features, configure Google Maps API key
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 