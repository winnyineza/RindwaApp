import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
}

/**
 * Convert address to coordinates using Google Maps Geocoding API
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    const response = await client.geocode({
      params: {
        address: address,
        key: process.env.GOOGLE_MAPS_API_KEY,
        region: 'rw', // Bias results to Rwanda
      },
    });

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const location = result.geometry.location;

      return {
        lat: location.lat,
        lng: location.lng,
        address: result.formatted_address,
        placeId: result.place_id,
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Convert coordinates to address using Google Maps Reverse Geocoding API
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    const response = await client.reverseGeocode({
      params: {
        latlng: { lat, lng },
        key: process.env.GOOGLE_MAPS_API_KEY,
        result_type: ['street_address', 'route', 'sublocality', 'locality'],
      },
    });

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];

      return {
        lat,
        lng,
        address: result.formatted_address,
        placeId: result.place_id,
      };
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Get place details by place ID
 */
export async function getPlaceDetails(placeId: string): Promise<any> {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        key: process.env.GOOGLE_MAPS_API_KEY,
        fields: ['formatted_address', 'geometry', 'name', 'types'],
      },
    });

    return response.data.result;
  } catch (error) {
    console.error('Place details error:', error);
    return null;
  }
}