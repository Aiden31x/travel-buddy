// /app/api/trip/resolve/route.ts
import type { NextRequest } from 'next/server';

// Input types (from /api/trip/plan)
interface TripItinerary {
  destination: string;
  days: number;
  budget: string;
  itinerary: {
    day: number;
    places: {
      name: string;
      time: 'morning' | 'afternoon' | 'evening';
    }[];
  }[];
}

// Output types (enriched with coordinates)
interface EnrichedPlace {
  name: string;
  time: 'morning' | 'afternoon' | 'evening';
  lat: string;
  lon: string;
  place_id?: string;
  address?: string;
  type?: string;
}

interface EnrichedItinerary {
  destination: string;
  days: number;
  budget: string;
  itinerary: {
    day: number;
    places: EnrichedPlace[];
  }[];
  resolution_info: {
    total_places: number;
    resolved_places: number;
    unresolved_places: string[];
    resolution_time: number;
  };
}

interface ErrorResponse {
  error: string;
  details?: string;
}

// Cache for place lookups to avoid repeated API calls
const coordinateCache = new Map<string, { 
  data: any; 
  timestamp: number; 
}>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Helper function to find place coordinates
async function resolveCoordinates(
  placeName: string, 
  destinationLat: string, 
  destinationLon: string,
  request: NextRequest
): Promise<{ lat: string; lon: string; place_id?: string; address?: string; type?: string } | null> {
  
  const cacheKey = `${placeName.toLowerCase()}_${destinationLat}_${destinationLon}`;
  
  // Check cache first
  if (coordinateCache.has(cacheKey)) {
    const cached = coordinateCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    coordinateCache.delete(cacheKey);
  }

  try {
    // First, try to find the place using nearby search (most accurate for landmarks)
    const nearbyUrl = new URL('/api/places/nearby', request.url);
    nearbyUrl.searchParams.set('lat', destinationLat);
    nearbyUrl.searchParams.set('lon', destinationLon);
    nearbyUrl.searchParams.set('category', 'tourist_attractions');
    nearbyUrl.searchParams.set('radius', '20000'); // 20km radius for resolution
    nearbyUrl.searchParams.set('limit', '100');

    const nearbyResponse = await fetch(nearbyUrl.toString(), {
      method: 'GET',
      headers: { 'User-Agent': 'WanderLustwand/1.0' },
    });

    if (nearbyResponse.ok) {
      const nearbyData = await nearbyResponse.json();
      const nearbyPlaces = nearbyData.places || [];

      // Find exact or fuzzy match in nearby results
      const normalizedSearchName = placeName.toLowerCase().trim();
      
      const exactMatch = nearbyPlaces.find((place: any) => 
        place.name.toLowerCase().trim() === normalizedSearchName
      );

      if (exactMatch) {
        const result = {
          lat: exactMatch.lat,
          lon: exactMatch.lon,
          place_id: exactMatch.id,
          address: exactMatch.address,
          type: exactMatch.type,
        };
        coordinateCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      // Try fuzzy match if exact match not found
      const fuzzyMatch = nearbyPlaces.find((place: any) => {
        const placeNameLower = place.name.toLowerCase();
        return placeNameLower.includes(normalizedSearchName) || 
               normalizedSearchName.includes(placeNameLower);
      });

      if (fuzzyMatch) {
        const result = {
          lat: fuzzyMatch.lat,
          lon: fuzzyMatch.lon,
          place_id: fuzzyMatch.id,
          address: fuzzyMatch.address,
          type: fuzzyMatch.type,
        };
        coordinateCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    }

    // Fallback: Use autocomplete to find the place
    console.log(`🔍 Fallback search for: ${placeName}`);
    
    const autocompleteUrl = new URL('/api/places/autocomplete', request.url);
    autocompleteUrl.searchParams.set('q', `${placeName} ${destinationLat} ${destinationLon}`);

    const autocompleteResponse = await fetch(autocompleteUrl.toString(), {
      method: 'GET',
      headers: { 'User-Agent': 'WanderLustwand/1.0' },
    });

    if (autocompleteResponse.ok) {
      const autocompleteData = await autocompleteResponse.json();
      const predictions = autocompleteData.predictions || [];

      if (predictions.length > 0) {
        const bestMatch = predictions[0];
        const result = {
          lat: bestMatch.lat,
          lon: bestMatch.lon,
          place_id: bestMatch.place_id,
          type: bestMatch.type,
        };
        coordinateCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    }

    // If all else fails, return null
    console.log(`❌ Could not resolve coordinates for: ${placeName}`);
    return null;

  } catch (error) {
    console.error(`❌ Error resolving ${placeName}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    let itineraryData: TripItinerary;
    try {
      itineraryData = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body' 
      } as ErrorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate itinerary structure
    if (!itineraryData.destination || !Array.isArray(itineraryData.itinerary)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid itinerary structure',
        details: 'Expected: { destination, days, budget, itinerary: [...] }'
      } as ErrorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`📍 Resolving coordinates for ${itineraryData.destination} itinerary`);

    // We need destination coordinates to center our search
    // For this, we'll use autocomplete to get destination coords
    const destinationResult = await fetch(
      `/api/places/autocomplete?q=${encodeURIComponent(itineraryData.destination)}`,
      {
        method: 'GET',
        headers: { 'User-Agent': 'WanderLustwand/1.0' },
      }
    );

    let destinationLat = '0';
    let destinationLon = '0';

    if (destinationResult.ok) {
      const destData = await destinationResult.json();
      if (destData.predictions && destData.predictions.length > 0) {
        destinationLat = destData.predictions[0].lat;
        destinationLon = destData.predictions[0].lon;
      }
    }

    // Count total places to resolve
    const totalPlaces = itineraryData.itinerary.reduce(
      (count, day) => count + day.places.length, 
      0
    );

    console.log(`🔧 Resolving ${totalPlaces} places across ${itineraryData.days} days`);

    // Resolve coordinates for each place in the itinerary
    const enrichedItinerary = [];
    const unresolvedPlaces: string[] = [];
    let resolvedCount = 0;

    for (const day of itineraryData.itinerary) {
      const enrichedDay = {
        day: day.day,
        places: [] as EnrichedPlace[],
      };

      // Process each place in parallel for better performance
      const placePromises = day.places.map(async (place) => {
        const coordinates = await resolveCoordinates(
          place.name,
          destinationLat,
          destinationLon,
          request
        );

        if (coordinates) {
          resolvedCount++;
          return {
            name: place.name,
            time: place.time,
            lat: coordinates.lat,
            lon: coordinates.lon,
            place_id: coordinates.place_id,
            address: coordinates.address,
            type: coordinates.type,
          } as EnrichedPlace;
        } else {
          unresolvedPlaces.push(place.name);
          // Return place without coordinates (fallback)
          return {
            name: place.name,
            time: place.time,
            lat: destinationLat, // Use destination coordinates as fallback
            lon: destinationLon,
          } as EnrichedPlace;
        }
      });

      // Wait for all places in this day to be resolved
      const resolvedPlaces = await Promise.all(placePromises);
      enrichedDay.places = resolvedPlaces;
      enrichedItinerary.push(enrichedDay);
    }

    const resolutionTime = Date.now() - startTime;
    
    console.log(`✅ Coordinate resolution complete: ${resolvedCount}/${totalPlaces} places resolved in ${resolutionTime}ms`);
    
    if (unresolvedPlaces.length > 0) {
      console.log(`⚠️ Unresolved places: ${unresolvedPlaces.join(', ')}`);
    }

    // Build final enriched response
    const enrichedResponse: EnrichedItinerary = {
      destination: itineraryData.destination,
      days: itineraryData.days,
      budget: itineraryData.budget,
      itinerary: enrichedItinerary,
      resolution_info: {
        total_places: totalPlaces,
        resolved_places: resolvedCount,
        unresolved_places: unresolvedPlaces,
        resolution_time: resolutionTime,
      },
    };

    return new Response(JSON.stringify(enrichedResponse), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    const resolutionTime = Date.now() - startTime;
    console.error('❌ Trip resolution error:', error);
    
    let errorMessage = 'Internal server error during coordinate resolution';
    let details = undefined;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Coordinate resolution timeout';
        details = 'Please try again with fewer places';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Failed to connect to location services';
        details = 'Please check your internet connection and try again';
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      details
    } as ErrorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}