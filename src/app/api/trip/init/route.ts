// /app/api/trip/init/route.ts
import type { NextRequest } from 'next/server';

// Input validation types
interface TripInitRequest {
  destination: string;
  places: string[];
  days: number;
  budget: string;
}

interface ValidatedTripRequest {
  destination: {
    name: string;
    place_id: string;
    lat: string;
    lon: string;
  };
  places: {
    name: string;
    id: string;
    lat: string;
    lon: string;
  }[];
  days: number;
  budget: 'low' | 'moderate' | 'luxury';
}

interface ErrorResponse {
  error: string;
  details?: string[];
}

// Valid budget options
const VALID_BUDGETS = ['low', 'moderate', 'luxury'] as const;
type Budget = typeof VALID_BUDGETS[number];

// Cache for validation results to avoid repeated API calls
const validationCache = new Map<string, any>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function POST(request: NextRequest) {
  try {
    // Parse and validate JSON body
    let body: TripInitRequest;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body' 
      } as ErrorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields exist
    const { destination, places, days, budget } = body;
    const errors: string[] = [];

    if (!destination || typeof destination !== 'string' || destination.trim().length === 0) {
      errors.push('Destination is required and must be a non-empty string');
    }

    if (!Array.isArray(places) || places.length === 0) {
      errors.push('Places must be a non-empty array');
    } else if (places.some(place => typeof place !== 'string' || place.trim().length === 0)) {
      errors.push('All places must be non-empty strings');
    }

    if (!days || typeof days !== 'number' || days <= 0 || days > 30) {
      errors.push('Days must be a positive number between 1 and 30');
    }

    if (!budget || !VALID_BUDGETS.includes(budget as Budget)) {
      errors.push(`Budget must be one of: ${VALID_BUDGETS.join(', ')}`);
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed',
        details: errors
      } as ErrorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Validating trip to ${destination} with ${places.length} places for ${days} days`);

    // Step 1: Validate destination exists using autocomplete
    const destinationCacheKey = `dest_${destination.toLowerCase().trim()}`;
    let destinationResult = null;

    if (validationCache.has(destinationCacheKey)) {
      const cached = validationCache.get(destinationCacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        destinationResult = cached.data;
      }
    }

    if (!destinationResult) {
      const autocompleteUrl = new URL('/api/places/autocomplete', request.url);
      autocompleteUrl.searchParams.set('q', destination);

      const autocompleteResponse = await fetch(autocompleteUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'WanderLustwand/1.0',
        },
      });

      if (!autocompleteResponse.ok) {
        const errorData = await autocompleteResponse.json().catch(() => ({}));
        return new Response(JSON.stringify({ 
          error: 'Failed to validate destination',
          details: [errorData.error || 'Autocomplete service unavailable']
        } as ErrorResponse), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const autocompleteData = await autocompleteResponse.json();
      const predictions = autocompleteData.predictions || [];

      if (predictions.length === 0) {
        return new Response(JSON.stringify({ 
          error: `Destination "${destination}" not found`,
          details: ['Please try a more specific location name']
        } as ErrorResponse), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Use the first (most relevant) prediction
      destinationResult = predictions[0];
      
      // Cache the result
      validationCache.set(destinationCacheKey, {
        data: destinationResult,
        timestamp: Date.now()
      });
    }

    console.log(`✅ Destination validated: ${destinationResult.description}`);

    // Step 2: Validate places exist using nearby search
    const placesCacheKey = `places_${destinationResult.lat}_${destinationResult.lon}`;
    let nearbyPlaces = null;

    if (validationCache.has(placesCacheKey)) {
      const cached = validationCache.get(placesCacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        nearbyPlaces = cached.data;
      }
    }

    if (!nearbyPlaces) {
      const nearbyUrl = new URL('/api/places/nearby', request.url);
      nearbyUrl.searchParams.set('lat', destinationResult.lat);
      nearbyUrl.searchParams.set('lon', destinationResult.lon);
      nearbyUrl.searchParams.set('category', 'tourist_attractions');
      nearbyUrl.searchParams.set('radius', '10000'); // 10km radius for validation
      nearbyUrl.searchParams.set('limit', '100');

      const nearbyResponse = await fetch(nearbyUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'WanderLustwand/1.0',
        },
      });

      if (!nearbyResponse.ok) {
        const errorData = await nearbyResponse.json().catch(() => ({}));
        return new Response(JSON.stringify({ 
          error: 'Failed to validate places',
          details: [errorData.error || 'Nearby places service unavailable']
        } as ErrorResponse), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const nearbyData = await nearbyResponse.json();
      nearbyPlaces = nearbyData.places || [];
      
      // Cache the result
      validationCache.set(placesCacheKey, {
        data: nearbyPlaces,
        timestamp: Date.now()
      });
    }

    console.log(`🔍 Found ${nearbyPlaces.length} nearby places for validation`);

    // Step 3: Match requested places with nearby results with improved fuzzy matching
    const validatedPlaces = [];
    const invalidPlaces = [];

    for (const requestedPlace of places) {
      const normalizedRequested = requestedPlace.toLowerCase().trim();
      
      // Enhanced fuzzy matching with multiple strategies
      const matchedPlace = nearbyPlaces.find((nearby: any) => {
        const normalizedNearby = nearby.name.toLowerCase().trim();
        
        // Strategy 1: Exact match
        if (normalizedNearby === normalizedRequested) return true;
        
        // Strategy 2: Contains match (either direction)
        if (normalizedNearby.includes(normalizedRequested) || 
            normalizedRequested.includes(normalizedNearby)) return true;
        
        // Strategy 3: Common landmark name mappings
        const landmarkMappings: { [key: string]: string[] } = {
          'colosseum': ['colosseo', 'amphitheatrum flavium', 'anfiteatro flavio'],
          'trevi fountain': ['fontana di trevi', 'trevi', 'fontana'],
          'vatican museums': ['musei vaticani', 'vatican', 'vaticani', 'sistine chapel'],
          'sistine chapel': ['cappella sistina', 'sistina', 'musei vaticani'],
          'pantheon': ['pantheon'],
          'spanish steps': ['scalinata di trinità dei monti', 'trinità dei monti', 'spanish'],
          'roman forum': ['foro romano', 'forum romanum', 'forum'],
          'st peters basilica': ['basilica di san pietro', 'san pietro', 'st peter'],
          'castel santangelo': ['castel sant\'angelo', 'mausoleum of hadrian', 'castello'],
        };
        
        // Check if requested place matches any known variants
        for (const [english, variants] of Object.entries(landmarkMappings)) {
          if (normalizedRequested.includes(english)) {
            if (variants.some(variant => normalizedNearby.includes(variant))) {
              return true;
            }
          }
        }
        
        // Strategy 4: Word-by-word partial matching
        const requestedWords = normalizedRequested.split(' ').filter(word => word.length > 2);
        const nearbyWords = normalizedNearby.split(' ').filter(word => word.length > 2);
        
        // If 50% of significant words match, consider it a match
        const matchingWords = requestedWords.filter(reqWord => 
          nearbyWords.some(nearbyWord => 
            nearbyWord.includes(reqWord) || reqWord.includes(nearbyWord)
          )
        );
        
        return matchingWords.length >= Math.ceil(requestedWords.length * 0.5);
      });

      if (matchedPlace) {
        validatedPlaces.push({
          name: matchedPlace.name,
          id: matchedPlace.id,
          lat: matchedPlace.lat,
          lon: matchedPlace.lon,
        });
        console.log(`✅ Validated place: "${requestedPlace}" → "${matchedPlace.name}"`);
      } else {
        invalidPlaces.push(requestedPlace);
        console.log(`❌ Invalid place: "${requestedPlace}"`);
        
        // Log nearby place names for debugging
        console.log(`🔍 Available nearby places:`, nearbyPlaces.slice(0, 10).map((p: any) => p.name));
      }
    }

    // Check if we have any valid places
    if (validatedPlaces.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'None of the requested places were found near the destination',
        details: invalidPlaces.map(place => `"${place}" not found near ${destination}`)
      } as ErrorResponse), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Warn about invalid places but continue with valid ones
    if (invalidPlaces.length > 0) {
      console.log(`⚠️ Some places were not found: ${invalidPlaces.join(', ')}`);
    }

    // Step 4: Build validated response
    const validatedRequest: ValidatedTripRequest = {
      destination: {
        name: destinationResult.description.split(',')[0].trim(),
        place_id: destinationResult.place_id,
        lat: destinationResult.lat,
        lon: destinationResult.lon,
      },
      places: validatedPlaces,
      days: Math.floor(days),
      budget: budget as Budget,
    };

    console.log(`✅ Trip validation complete: ${validatedPlaces.length}/${places.length} places validated`);

    // Return success response with any warnings
    const response = {
      ...validatedRequest,
      validation_info: {
        total_places_requested: places.length,
        valid_places_found: validatedPlaces.length,
        invalid_places: invalidPlaces.length > 0 ? invalidPlaces : undefined,
        warnings: invalidPlaces.length > 0 ? 
          [`${invalidPlaces.length} place(s) were not found and will be excluded from your trip`] : 
          undefined
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache', // Don't cache validation results
      },
    });

  } catch (error) {
    console.error('❌ Trip init error:', error);
    
    let errorMessage = 'Internal server error during trip validation';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Validation timeout - please try again';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Failed to connect to location services';
      }
    }

    return new Response(JSON.stringify({ 
      error: errorMessage 
    } as ErrorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}