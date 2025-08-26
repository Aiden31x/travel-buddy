// /app/api/places/nearby/route.ts
import { buildOverpassQuery, getAllCategories, getCategoryById } from '@/app/lib/travel-categories';
import type { NextRequest } from 'next/server';


interface NearbyPlace {
  id: string;
  name: string;
  lat: string;
  lon: string;
  type: string;
  category: string;
  subcategory?: string;
  address?: string;
  amenity?: string;
}

interface NearbyResponse {
  places: NearbyPlace[];
  category_info: {
    requested_category: string;
    category_name: string;
    total_results: number;
  };
  available_categories?: string[];
}

interface ErrorResponse {
  error: string;
  available_categories?: string[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius') || '2000';
  const category = searchParams.get('category') || 'tourist_attractions';
  const limit = searchParams.get('limit') || '50';

  // Get available categories for error responses
  const availableCategories = getAllCategories().map(cat => cat.id);

  // Validate required parameters
  if (!lat || !lon || isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
    return new Response(JSON.stringify({ 
      error: 'Valid "lat" and "lon" query parameters are required',
      available_categories: availableCategories
    } as ErrorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate radius
  const radiusNum = parseInt(radius);
  if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 50000) {
    return new Response(JSON.stringify({ 
      error: 'Radius must be between 1 and 50000 meters',
      available_categories: availableCategories
    } as ErrorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate limit
  const limitNum = parseInt(limit);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return new Response(JSON.stringify({ 
      error: 'Limit must be between 1 and 100',
      available_categories: availableCategories
    } as ErrorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if category exists
  const categoryConfig = getCategoryById(category);
  if (!categoryConfig) {
    return new Response(JSON.stringify({ 
      error: `Category '${category}' not found. Please use one of the available categories.`,
      available_categories: availableCategories
    } as ErrorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Build the Overpass query using our category system
    const overpassQuery = buildOverpassQuery(category, parseFloat(lat), parseFloat(lon), radiusNum);
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
    console.log(`🛰️ Testing URL: ${overpassUrl}`); 

    console.log(`🔍 Searching for ${categoryConfig.name} near ${lat}, ${lon}`);
    console.log(`📏 Radius: ${radius}m, Limit: ${limit}`);
    console.log(`🗺️ Overpass Query:`, overpassQuery);

    const response = await fetch(overpassUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'TravelBuddy/1.0 (contact@travelbuddy.com)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Overpass API error response:', errorText);
      throw new Error(`Overpass API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as any;

    // Process and filter the results
    const places: NearbyPlace[] = (data.elements || [])
      .filter((element: any) => {
        // Filter out elements without coordinates or name
        const hasCoords = element.lat && element.lon || (element.center?.lat && element.center?.lon);
        const hasName = element.tags?.name;
        return hasCoords && hasName;
      })
      .map((element: any) => {
        // Determine the main category and subcategory
        const tags = element.tags || {};
        let mainType = '';
        let subcategory = '';
        
        // Determine type based on available tags
        if (tags.tourism) {
          mainType = tags.tourism;
        } else if (tags.amenity) {
          mainType = tags.amenity;
        } else if (tags.shop) {
          mainType = tags.shop;
        } else if (tags.historic) {
          mainType = tags.historic;
        } else if (tags.leisure) {
          mainType = tags.leisure;
        } else if (tags.natural) {
          mainType = tags.natural;
        } else if (tags.railway) {
          mainType = tags.railway;
        } else if (tags.aeroway) {
          mainType = tags.aeroway;
        } else {
          mainType = 'unknown';
        }

        // Get subcategory for more specific classification
        subcategory = tags.cuisine || tags.shop || tags.historic || tags.tourism || '';

        // Build address from available tags
        let address = '';
        if (tags['addr:full']) {
          address = tags['addr:full'];
        } else {
          const addressParts = [
            tags['addr:housenumber'],
            tags['addr:street'],
            tags['addr:city'],
            tags['addr:postcode']
          ].filter(Boolean);
          address = addressParts.join(', ') || '';
        }

        return {
          id: element.id.toString(),
          name: tags.name || tags.operator || `Unnamed ${mainType}`,
          lat: (element.lat || element.center?.lat || '0').toString(),
          lon: (element.lon || element.center?.lon || '0').toString(),
          type: mainType,
          category: category,
          subcategory: subcategory || undefined,
          address: address || undefined,
          amenity: tags.amenity || undefined,
        };
      })
      .slice(0, limitNum); // Apply limit

    console.log(`✅ Found ${places.length} ${categoryConfig.name} locations`);

    const responseData: NearbyResponse = {
      places,
      category_info: {
        requested_category: category,
        category_name: categoryConfig.name,
        total_results: places.length,
      },
      available_categories: availableCategories
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ Nearby API Error:', error);
    
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - the search took too long';
      } else if (error.message.includes('Overpass')) {
        errorMessage = 'External mapping service temporarily unavailable';
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      available_categories: availableCategories
    } as ErrorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}