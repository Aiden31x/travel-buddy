// /app/api/places/search/route.ts
import type { NextRequest } from 'next/server';

// Input types for place search
interface PlaceSearchRequest {
  query: string;
  location?: string; // Optional: search near a specific location
  type?: 'restaurant' | 'attraction' | 'hotel' | 'shopping' | 'entertainment' | 'all';
  limit?: number; // Max results to return (default: 10)
}

// Serper API response types
interface SerperPlace {
  title: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  rating?: number;
  ratingCount?: number;
  category?: string;
  hours?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
}

interface SerperResponse {
  places?: SerperPlace[];
  searchParameters?: {
    q: string;
    type: string;
  };
}

// Output types for our API - matching your interface
interface SearchResponse {
  success: true;
  results: {
    name: string;
    description?: string;
    rating?: number;
    website?: string;
    image?: string;
    type?: string;
    // Additional fields for internal use (coordinates, etc.)
    lat?: string;
    lon?: string;
    address?: string;
    phone?: string;
    hours?: string;
    category?: string;
    id?: string;
  }[];
  // Additional metadata (optional)
  query?: string;
  location?: string;
  total_results?: number;
  search_info?: {
    api: string;
    generation_time: number;
  };
}

interface ErrorResponse {
  error: string;
  details?: string;
}

// Serper API configuration
const SERPER_API_URL = 'https://google.serper.dev/places';

// Rate limiting for Serper API
let lastSerperRequest = 0;
const MIN_SERPER_INTERVAL = 100; // 100ms between requests (Serper allows higher rate)

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    let searchRequest: PlaceSearchRequest;
    try {
      searchRequest = await request.json();
    } catch {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body' 
      } as ErrorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate input
    const { query, location, type = 'all', limit = 10 } = searchRequest;
    const errors: string[] = [];

    if (!query || query.trim().length < 2) {
      errors.push('Query must be at least 2 characters long');
    }

    if (query.length > 100) {
      errors.push('Query must be less than 100 characters');
    }

    if (limit && (limit < 1 || limit > 20)) {
      errors.push('Limit must be between 1 and 20');
    }

    if (type && !['restaurant', 'attraction', 'hotel', 'shopping', 'entertainment', 'all'].includes(type)) {
      errors.push('Type must be one of: restaurant, attraction, hotel, shopping, entertainment, all');
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed',
        details: errors.join('; ')
      } as ErrorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 Searching for places: "${query}" ${location ? `near ${location}` : ''}`);

    // Build search query for Serper
    let searchQuery = query.trim();
    
    // Add location context if provided
    if (location) {
      searchQuery += ` in ${location}`;
    }

    // Add type-specific terms for better results
    if (type !== 'all') {
      const typeTerms = {
        restaurant: 'restaurant food dining',
        attraction: 'tourist attraction sightseeing',
        hotel: 'hotel accommodation stay',
        shopping: 'shopping mall store',
        entertainment: 'entertainment fun activity'
      };
      searchQuery += ` ${typeTerms[type as keyof typeof typeTerms]}`;
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastSerperRequest;
    if (timeSinceLastRequest < MIN_SERPER_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_SERPER_INTERVAL - timeSinceLastRequest));
    }

    // Call Serper API
    const serperApiKey = process.env.SERPER_API_KEY;
    if (!serperApiKey) {
      return new Response(JSON.stringify({ 
        error: 'Serper API key not configured',
        details: 'Please set SERPER_API_KEY environment variable'
      } as ErrorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`🚀 Calling Serper API with query: "${searchQuery}"`);

    const serperResponse = await fetch(SERPER_API_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: Math.min(limit, 20), // Serper max is typically 20
      }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    lastSerperRequest = Date.now();

    if (!serperResponse.ok) {
      const errorText = await serperResponse.text();
      console.error('Serper API error:', errorText);
      
      if (serperResponse.status === 401) {
        return new Response(JSON.stringify({ 
          error: 'Serper API authentication failed',
          details: 'Invalid API key'
        } as ErrorResponse), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (serperResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Search rate limit exceeded',
          details: 'Please wait a moment and try again'
        } as ErrorResponse), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Serper API error: ${serperResponse.status}`);
    }

    const serperData: SerperResponse = await serperResponse.json();
    
    if (!serperData.places || serperData.places.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        results: [],
        query,
        location,
        total_results: 0,
        search_info: {
          api: 'serper',
          generation_time: Date.now() - startTime,
        }
      } as SearchResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Transform Serper response to your SearchResponse format
    const transformedResults = serperData.places
      .filter(place => place.latitude && place.longitude) // Only include places with coordinates
      .slice(0, limit) // Respect the limit
      .map((place, index) => ({
        // Your required interface fields
        name: place.title || 'Unknown Place',
        description: place.address, // Using address as description
        rating: place.rating,
        website: place.website,
        image: place.imageUrl,
        type: mapCategoryToType(place.category),
        
        // Additional useful fields (optional)
        lat: place.latitude!.toString(),
        lon: place.longitude!.toString(),
        address: place.address,
        phone: place.phoneNumber,
        hours: place.hours,
        category: place.category,
        id: place.placeId || `${place.title?.replace(/\s+/g, '-').toLowerCase()}-${index}`,
      }));

    const generationTime = Date.now() - startTime;
    
    console.log(`✅ Found ${transformedResults.length} places with coordinates in ${generationTime}ms`);

    const response: SearchResponse = {
      success: true,
      results: transformedResults,
      query,
      location,
      total_results: transformedResults.length,
      search_info: {
        api: 'serper',
        generation_time: generationTime,
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });

  } catch (error) {
    console.error('❌ Place search error:', error, `(after ${Date.now() - startTime}ms)`);
    
    let errorMessage = 'Internal server error during place search';
    let details = undefined;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Search timeout - the request took too long';
        details = 'Please try a more specific search query';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Failed to connect to search service';
        details = 'Please check your internet connection and try again';
      } else if (error.message.includes('Serper')) {
        errorMessage = 'Search service temporarily unavailable';
        details = 'Please try again in a few minutes';
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

// Helper function to map Serper categories to our place types
function mapCategoryToType(category?: string): string | undefined {
  if (!category) return undefined;
  
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('restaurant') || categoryLower.includes('food') || categoryLower.includes('cafe')) {
    return 'restaurant';
  } else if (categoryLower.includes('hotel') || categoryLower.includes('accommodation') || categoryLower.includes('lodging')) {
    return 'hotel';
  } else if (categoryLower.includes('attraction') || categoryLower.includes('museum') || categoryLower.includes('park') || categoryLower.includes('monument')) {
    return 'attraction';
  } else if (categoryLower.includes('shop') || categoryLower.includes('store') || categoryLower.includes('mall')) {
    return 'shopping';
  } else if (categoryLower.includes('bar') || categoryLower.includes('club') || categoryLower.includes('entertainment') || categoryLower.includes('theater')) {
    return 'entertainment';
  }
  
  return category;
}

// GET method for simple queries (optional convenience method)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const location = searchParams.get('location');
  const type = searchParams.get('type') as PlaceSearchRequest['type'];
  const limit = searchParams.get('limit');

  if (!query) {
    return new Response(JSON.stringify({ 
      error: 'Missing query parameter',
      details: 'Add ?q=your_search_query to the URL'
    } as ErrorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Convert GET params to POST body format
  const searchRequest: PlaceSearchRequest = {
    query,
    ...(location && { location }),
    ...(type && { type }),
    ...(limit && { limit: parseInt(limit) }),
  };

  // Create a new request with POST method and JSON body
  const postRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchRequest),
  });

  // Call the POST handler
  return POST(postRequest as NextRequest);
}