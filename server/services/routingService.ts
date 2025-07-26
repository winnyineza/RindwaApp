import axios from 'axios';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../db';

interface LocationCoords {
  lat: number;
  lng: number;
}

interface RouteInfo {
  distance: number; // in kilometers
  duration: number; // in minutes
  durationInTraffic?: number; // in minutes with current traffic
  routeQuality: 'excellent' | 'good' | 'fair' | 'poor';
  isEmergencyOptimized: boolean;
  provider: string;
  confidence: number; // 0-100%
}

interface StationRoute {
  stationId: string;
  stationName: string;
  stationCoords: LocationCoords;
  route: RouteInfo;
  emergencyETA: number; // estimated arrival time in minutes
  priority: number; // calculated priority score
}

interface RoutingProvider {
  name: string;
  isAvailable: boolean;
  apiKey?: string;
  baseUrl: string;
}

export class EnhancedRoutingService {
  
  private static providers: RoutingProvider[] = [
    {
      name: 'Google Maps',
      isAvailable: !!process.env.GOOGLE_MAPS_API_KEY,
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
      baseUrl: 'https://maps.googleapis.com/maps/api'
    },
    {
      name: 'OpenRouteService',
      isAvailable: !!process.env.OPENROUTE_API_KEY,
      apiKey: process.env.OPENROUTE_API_KEY,
      baseUrl: 'https://api.openrouteservice.org/v2'
    },
    {
      name: 'MapBox',
      isAvailable: !!process.env.MAPBOX_API_KEY,
      apiKey: process.env.MAPBOX_API_KEY,
      baseUrl: 'https://api.mapbox.com'
    }
  ];

  /**
   * Enhanced distance calculation using real-world routing
   */
  static async calculateAccurateRoute(
    origin: LocationCoords,
    destination: LocationCoords,
    isEmergency: boolean = true
  ): Promise<RouteInfo> {
    
    const providers = this.providers.filter(p => p.isAvailable);
    
    if (providers.length === 0) {
      console.warn('⚠️ No routing providers available, falling back to Haversine');
      return this.fallbackHaversineRoute(origin, destination);
    }

    // Try providers in order of preference
    for (const provider of providers) {
      try {
        const route = await this.getRouteFromProvider(provider, origin, destination, isEmergency);
        if (route) {
          console.log(`✅ Route calculated via ${provider.name}: ${route.distance.toFixed(1)}km, ${route.duration}min`);
          return route;
        }
      } catch (error) {
        console.warn(`❌ ${provider.name} routing failed:`, (error as Error).message);
        continue;
      }
    }

    // All providers failed, use fallback
    console.warn('⚠️ All routing providers failed, using Haversine fallback');
    return this.fallbackHaversineRoute(origin, destination);
  }

  /**
   * Google Maps Distance Matrix API with traffic
   */
  private static async getGoogleMapsRoute(
    origin: LocationCoords,
    destination: LocationCoords,
    isEmergency: boolean
  ): Promise<RouteInfo | null> {
    
    const { apiKey } = this.providers.find(p => p.name === 'Google Maps')!;
    if (!apiKey) return null;

    const params = {
      origins: `${origin.lat},${origin.lng}`,
      destinations: `${destination.lat},${destination.lng}`,
      mode: 'driving',
      departure_time: 'now', // For real-time traffic
      traffic_model: 'pessimistic', // Conservative estimates for emergency response
      units: 'metric',
      key: apiKey
    };

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/distancematrix/json',
      { params, timeout: 5000 }
    );

    if (response.data.status !== 'OK' || !response.data.rows[0]?.elements[0]) {
      throw new Error('Google Maps API returned no results');
    }

    const element = response.data.rows[0].elements[0];
    
    if (element.status !== 'OK') {
      throw new Error(`Google Maps API error: ${element.status}`);
    }

    const distance = element.distance.value / 1000; // Convert to km
    const duration = element.duration.value / 60; // Convert to minutes
    const durationInTraffic = element.duration_in_traffic?.value / 60; // With traffic

    // Emergency vehicles can reduce travel time by 20-40%
    const emergencyFactor = isEmergency ? 0.7 : 1.0;
    const emergencyDuration = duration * emergencyFactor;
    const emergencyTrafficDuration = durationInTraffic ? durationInTraffic * emergencyFactor : undefined;

    return {
      distance,
      duration: emergencyDuration,
      durationInTraffic: emergencyTrafficDuration,
      routeQuality: this.assessRouteQuality(distance, duration, durationInTraffic),
      isEmergencyOptimized: isEmergency,
      provider: 'Google Maps',
      confidence: 95
    };
  }

  /**
   * OpenRouteService API for alternative routing
   */
  private static async getOpenRouteServiceRoute(
    origin: LocationCoords,
    destination: LocationCoords,
    isEmergency: boolean
  ): Promise<RouteInfo | null> {
    
    const { apiKey } = this.providers.find(p => p.name === 'OpenRouteService')!;
    if (!apiKey) return null;

    const body = {
      coordinates: [[origin.lng, origin.lat], [destination.lng, destination.lat]],
      profile: 'driving-car',
      format: 'json',
      preference: isEmergency ? 'fastest' : 'recommended',
      options: {
        avoid_features: isEmergency ? ['ferries'] : ['ferries', 'tollways']
      }
    };

    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/json',
      body,
      {
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('OpenRouteService returned no routes');
    }

    const route = response.data.routes[0];
    const distance = route.summary.distance / 1000; // Convert to km
    const duration = route.summary.duration / 60; // Convert to minutes

    // Emergency adjustment
    const emergencyFactor = isEmergency ? 0.75 : 1.0;
    const emergencyDuration = duration * emergencyFactor;

    return {
      distance,
      duration: emergencyDuration,
      routeQuality: this.assessRouteQuality(distance, duration),
      isEmergencyOptimized: isEmergency,
      provider: 'OpenRouteService',
      confidence: 85
    };
  }

  /**
   * MapBox Directions API
   */
  private static async getMapBoxRoute(
    origin: LocationCoords,
    destination: LocationCoords,
    isEmergency: boolean
  ): Promise<RouteInfo | null> {
    
    const { apiKey } = this.providers.find(p => p.name === 'MapBox')!;
    if (!apiKey) return null;

    const profile = isEmergency ? 'driving-traffic' : 'driving';
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;

    const params = {
      access_token: apiKey,
      geometries: 'geojson',
      overview: 'simplified'
    };

    const response = await axios.get(url, { params, timeout: 5000 });

    if (!response.data.routes || response.data.routes.length === 0) {
      throw new Error('MapBox returned no routes');
    }

    const route = response.data.routes[0];
    const distance = route.distance / 1000; // Convert to km
    const duration = route.duration / 60; // Convert to minutes

    // Emergency optimization
    const emergencyFactor = isEmergency ? 0.8 : 1.0;
    const emergencyDuration = duration * emergencyFactor;

    return {
      distance,
      duration: emergencyDuration,
      routeQuality: this.assessRouteQuality(distance, duration),
      isEmergencyOptimized: isEmergency,
      provider: 'MapBox',
      confidence: 80
    };
  }

  /**
   * Route provider dispatcher
   */
  private static async getRouteFromProvider(
    provider: RoutingProvider,
    origin: LocationCoords,
    destination: LocationCoords,
    isEmergency: boolean
  ): Promise<RouteInfo | null> {
    
    switch (provider.name) {
      case 'Google Maps':
        return this.getGoogleMapsRoute(origin, destination, isEmergency);
      case 'OpenRouteService':
        return this.getOpenRouteServiceRoute(origin, destination, isEmergency);
      case 'MapBox':
        return this.getMapBoxRoute(origin, destination, isEmergency);
      default:
        return null;
    }
  }

  /**
   * Fallback Haversine calculation with emergency adjustments
   */
  private static fallbackHaversineRoute(
    origin: LocationCoords,
    destination: LocationCoords
  ): RouteInfo {
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(destination.lat - origin.lat);
    const dLng = this.toRadians(destination.lng - origin.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(origin.lat)) * Math.cos(this.toRadians(destination.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightLineDistance = R * c;
    
    // Apply road factor (roads are typically 1.3-1.5x longer than straight line)
    const roadFactor = 1.4;
    const roadDistance = straightLineDistance * roadFactor;
    
    // Estimate duration based on average emergency vehicle speed (60 km/h in urban areas)
    const emergencySpeed = 60; // km/h
    const estimatedDuration = (roadDistance / emergencySpeed) * 60; // minutes

    return {
      distance: roadDistance,
      duration: estimatedDuration,
      routeQuality: 'fair',
      isEmergencyOptimized: true,
      provider: 'Haversine + Road Factor',
      confidence: 60
    };
  }

  /**
   * Assess route quality based on distance and time factors
   */
  private static assessRouteQuality(
    distance: number,
    duration: number,
    durationInTraffic?: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    
    const averageSpeed = distance / (duration / 60); // km/h
    const trafficFactor = durationInTraffic ? durationInTraffic / duration : 1;

    if (averageSpeed > 50 && trafficFactor < 1.2) return 'excellent';
    if (averageSpeed > 35 && trafficFactor < 1.5) return 'good';
    if (averageSpeed > 20 && trafficFactor < 2.0) return 'fair';
    return 'poor';
  }

  /**
   * Find optimal station with enhanced routing
   */
  static async findOptimalStationWithRouting(
    organizationType: 'health' | 'investigation' | 'police',
    incidentLocation: LocationCoords,
    urgencyLevel: 'critical' | 'high' | 'medium' | 'low' = 'high'
  ): Promise<StationRoute> {
    
    try {
      console.log(`📍 Finding optimal ${organizationType} station for emergency response...`);
      
      // Get all relevant stations
      const stations = await sequelize.query(
        `SELECT s.id, s.name, s.location, o.name as "orgName"
         FROM stations s 
         JOIN organizations o ON s.organisation_id = o.id 
         WHERE o.name ILIKE :orgPattern AND s.is_active = true`,
        {
          replacements: { 
            orgPattern: organizationType === 'health' ? '%Health%' : 
                       organizationType === 'investigation' ? '%Investigation%' : '%Police%'
          },
          type: QueryTypes.SELECT
        }
      ) as any[];

      if (stations.length === 0) {
        throw new Error(`No ${organizationType} stations found`);
      }

      console.log(`🚑 Calculating routes to ${stations.length} ${organizationType} stations...`);

      // Calculate routes to all stations in parallel
      const routePromises = stations.map(async (station) => {
        try {
          let stationCoords: LocationCoords;
          
          // Parse station location
          try {
            stationCoords = typeof station.location === 'string' 
              ? JSON.parse(station.location) 
              : station.location;
          } catch (e) {
            // Use Kigali center as fallback
            stationCoords = { lat: -1.9441, lng: 30.0619 };
          }

          // Ensure valid coordinates
          if (!stationCoords || typeof stationCoords.lat !== 'number') {
            stationCoords = { lat: -1.9441, lng: 30.0619 };
          }

          // Calculate enhanced route
          const route = await this.calculateAccurateRoute(
            incidentLocation, 
            stationCoords, 
            true // Emergency routing
          );

          // Calculate emergency ETA with urgency adjustments
          const urgencyMultiplier = {
            'critical': 0.6, // 40% faster response for critical
            'high': 0.75,
            'medium': 0.9,
            'low': 1.0
          }[urgencyLevel];

          const emergencyETA = (route.durationInTraffic || route.duration) * urgencyMultiplier;

          // Calculate priority score (lower is better)
          const distanceScore = route.distance * 0.4;
          const timeScore = emergencyETA * 0.6;
          const qualityBonus = {
            'excellent': -2,
            'good': -1,
            'fair': 0,
            'poor': 2
          }[route.routeQuality];

          const priority = distanceScore + timeScore + qualityBonus;

          return {
            stationId: station.id,
            stationName: station.name,
            stationCoords,
            route,
            emergencyETA,
            priority
          } as StationRoute;

                 } catch (error) {
           console.warn(`❌ Route calculation failed for station ${station.name}:`, (error as Error).message);
           return null;
         }
      });

      // Wait for all route calculations
      const stationRoutes = (await Promise.all(routePromises)).filter(Boolean) as StationRoute[];

      if (stationRoutes.length === 0) {
        throw new Error('Failed to calculate routes to any stations');
      }

      // Sort by priority (best route first)
      stationRoutes.sort((a, b) => a.priority - b.priority);

      const optimal = stationRoutes[0];
      
      console.log(`🎯 Optimal station selected: ${optimal.stationName}`);
      console.log(`   📏 Distance: ${optimal.route.distance.toFixed(1)}km`);
      console.log(`   ⏱️  ETA: ${optimal.emergencyETA.toFixed(1)} minutes`);
      console.log(`   🛣️  Route Quality: ${optimal.route.routeQuality}`);
      console.log(`   🚨 Provider: ${optimal.route.provider}`);

      return optimal;

    } catch (error) {
      console.error('Error in enhanced routing:', error);
      throw error;
    }
  }

  /**
   * Batch route calculation for multiple destinations
   */
  static async calculateMultipleRoutes(
    origin: LocationCoords,
    destinations: Array<{ id: string; name: string; coords: LocationCoords }>,
    isEmergency: boolean = true
  ): Promise<StationRoute[]> {
    
    console.log(`🗺️ Calculating ${destinations.length} routes in parallel...`);

    const routePromises = destinations.map(async (dest) => {
      try {
        const route = await this.calculateAccurateRoute(origin, dest.coords, isEmergency);
        
        return {
          stationId: dest.id,
          stationName: dest.name,
          stationCoords: dest.coords,
          route,
          emergencyETA: route.durationInTraffic || route.duration,
          priority: route.distance * 0.5 + (route.durationInTraffic || route.duration) * 0.5
        } as StationRoute;
             } catch (error) {
         console.warn(`Route calculation failed for ${dest.name}:`, (error as Error).message);
         return null;
       }
    });

    const results = (await Promise.all(routePromises)).filter(Boolean) as StationRoute[];
    return results.sort((a, b) => a.priority - b.priority);
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get routing service status
   */
  static getServiceStatus(): { 
    availableProviders: string[], 
    totalProviders: number,
    isFullyOperational: boolean 
  } {
    const availableProviders = this.providers
      .filter(p => p.isAvailable)
      .map(p => p.name);
    
    return {
      availableProviders,
      totalProviders: this.providers.length,
      isFullyOperational: availableProviders.length > 0
    };
  }
} 