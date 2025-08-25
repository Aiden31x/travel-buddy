import type { NextRequest } from 'next/server';

interface NearbyPlace {
  id: string;
  name: string;
  lat: string;
  lon: string;
  type: string;
  category: string;
}

interface NearbyResponse {
  places: NearbyPlace[];
}

interface ErrorResponse {
  error: string;
}

// Map common types to OSM tourism tags
const typeMapping: Record<string, string> = {
  'tourist_attraction': 'attraction',
  'attraction': 'attraction',
  'museum': 'museum',
  'hotel': 'hotel',
  'restaurant': 'restaurant',
  'viewpoint': 'viewpoint',
  'monument': 'monument',
  'gallery': 'gallery',
  'information': 'information'
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius') || '2000';
  const type = searchParams.get('type') || 'tourist_attraction';

  // Validate required parameters
  if (!lat || !lon || isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
    return new Response(JSON.stringify({ error: 'Valid "lat" and "lon" query parameters are required' } as ErrorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate radius
  const radiusNum = parseInt(radius);
  if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 50000) {
    return new Response(JSON.stringify({ error: 'Radius must be between 1 and 50000 meters' } as ErrorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Map the type to correct OSM tag
    const osmType = typeMapping[type] || 'attraction';
    
    // Construct Overpass API query with multiple relevant tags
    let overpassQuery = '';
    
    if (osmType === 'attraction') {
      // For tourist attractions, query multiple relevant tags
      overpassQuery = `
        [out:json][timeout:30][maxsize:1073741824];
        (
          node["tourism"="attraction"](around:${radius},${lat},${lon});
          way["tourism"="attraction"](around:${radius},${lat},${lon});
          relation["tourism"="attraction"](around:${radius},${lat},${lon});
          node["historic"](around:${radius},${lat},${lon});
          way["historic"](around:${radius},${lat},${lon});
          node["leisure"="park"](around:${radius},${lat},${lon});
          way["leisure"="park"](around:${radius},${lat},${lon});
          node["amenity"="place_of_worship"](around:${radius},${lat},${lon});
          way["amenity"="place_of_worship"](around:${radius},${lat},${lon});
        );
        out center meta 50;
      `.trim();
    } else {
      // For specific tourism types
      overpassQuery = `
        [out:json][timeout:30][maxsize:1073741824];
        (
          node["tourism"="${osmType}"](around:${radius},${lat},${lon});
          way["tourism"="${osmType}"](around:${radius},${lat},${lon});
          relation["tourism"="${osmType}"](around:${radius},${lat},${lon});
        );
        out center meta 50;
      `.trim();
    }

    const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

    console.log('Overpass query:', overpassQuery); // Debug log

    const response = await fetch(overpassUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'TravelBuddy/1.0 (contact@travelbuddy.com)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Overpass API error response:', errorText);
      throw new Error(`Overpass API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as any;
    console.log('Overpass response:', JSON.stringify(data, null, 2)); // Debug log

    // Map Overpass response to our structure
    const places: NearbyPlace[] = (data.elements || [])
      .filter((element: any) => {
        // Filter out elements without coordinates or name
        const hasCoords = element.lat && element.lon || (element.center?.lat && element.center?.lon);
        const hasName = element.tags?.name;
        return hasCoords && hasName;
      })
      .map((element: any) => ({
        id: element.id.toString(),
        name: element.tags?.name || element.tags?.historic || `Unnamed ${osmType}`,
        lat: (element.lat || element.center?.lat || '0').toString(),
        lon: (element.lon || element.center?.lon || '0').toString(),
        type: element.tags?.tourism || element.tags?.historic || element.tags?.leisure || element.tags?.amenity || osmType,
        category: type,
      }))
      .slice(0, 20); // Limit results

    return new Response(JSON.stringify({ places } as NearbyResponse), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300' // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    } as ErrorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}