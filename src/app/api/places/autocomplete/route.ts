import type { NextRequest } from 'next/server';

// Define the shape of a single Nominatim place result
interface NominatimPlace {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

// Define the shape of the response sent to the client
interface AutocompleteResponse {
  predictions: {
    place_id: string;
    description: string;
    lat: string;
    lon: string;
    type: string;
  }[];
}

// Define the error response shape
interface ErrorResponse {
  error: string;
}

// Simple in-memory cache to reduce API calls
const cache = new Map<string, { data: AutocompleteResponse; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe with Nominatim's 1req/sec limit

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || q.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Query parameter "q" is required' } as ErrorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Normalize query for caching
  const normalizedQuery = q.trim().toLowerCase();

  // Check cache first
  if (cache.has(normalizedQuery)) {
    const cached = cache.get(normalizedQuery)!;
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Cache hit for query: ${normalizedQuery}`);
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Remove expired cache entry
      cache.delete(normalizedQuery);
    }
  }

  try {
    // Rate limiting: ensure we don't exceed 1 request per second
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`;
    
    console.log(`Fetching from Nominatim: ${nominatimUrl}`);
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'TravelBuddy/1.0 (travel.buddy.app@example.com)', // Updated email
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    lastRequestTime = Date.now();

    if (!response.ok) {
      console.error(`Nominatim API error: ${response.status} ${response.statusText}`);
      
      // Handle specific error cases
      if (response.status === 403) {
        throw new Error('Access denied by Nominatim API. Please check rate limits and User-Agent header.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status >= 500) {
        throw new Error('Nominatim service is temporarily unavailable.');
      }
      
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = (await response.json()) as NominatimPlace[];

    const predictions = data.map((place) => ({
      place_id: place.place_id,
      description: place.display_name,
      lat: place.lat,
      lon: place.lon,
      type: place.type,
    }));

    const result: AutocompleteResponse = { predictions };

    // Cache the successful result
    cache.set(normalizedQuery, {
      data: result,
      timestamp: Date.now(),
    });

    // Clean up old cache entries (simple cleanup)
    if (cache.size > 100) {
      const entries = Array.from(cache.entries());
      const oldEntries = entries.filter(([, value]) => Date.now() - value.timestamp > CACHE_DURATION);
      oldEntries.forEach(([key]) => cache.delete(key));
    }

    console.log(`Successfully fetched ${predictions.length} results for query: ${normalizedQuery}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes on client side
      },
    });
  } catch (error) {
    console.error('Places autocomplete error:', error);
    
    // Return more specific error messages
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        errorMessage = 'Geocoding service temporarily unavailable. Please try again later.';
      } else if (error.message.includes('Rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.name === 'AbortError') {
        errorMessage = 'Request timeout. Please try again.';
      }
    }

    return new Response(JSON.stringify({ error: errorMessage } as ErrorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}