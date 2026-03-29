import { buildMultiCategoryOverpassQuery, getAllCategories, getCategoryById } from '@/app/lib/travel-categories';
import type { NextRequest } from 'next/server';

interface NearbyPlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  category: string;
  subcategory?: string;
  address?: string;
  amenity?: string;
}

interface NearbyResponse {
  places: NearbyPlace[];
  category_info: {
    requested_categories: string[];
    total_results: number;
  };
  available_categories?: string[];
}

interface ErrorResponse {
  error: string;
  available_categories?: string[];
}

const cache = new Map<string, { data: NearbyResponse; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

const TAG_TO_CATEGORY: Record<string, Record<string, string>> = {
  tourism: { attraction: 'tourist_attractions', hotel: 'hotels', hostel: 'hostels', guest_house: 'guest_houses', camp_site: 'camping', caravan_site: 'camping', museum: 'museums', gallery: 'galleries', zoo: 'entertainment', aquarium: 'entertainment', theme_park: 'entertainment', viewpoint: 'viewpoints' },
  amenity: { restaurant: 'restaurants', cafe: 'cafes', fast_food: 'fast_food', pub: 'pubs_bars', bar: 'pubs_bars', biergarten: 'pubs_bars', ice_cream: 'ice_cream', theatre: 'entertainment_venues', cinema: 'entertainment_venues', hospital: 'hospitals', clinic: 'clinics', doctors: 'clinics', pharmacy: 'pharmacies', police: 'police', atm: 'atms', bank: 'banks', marketplace: 'markets', bus_station: 'bus_stops', ferry_terminal: 'ferry', car_rental: 'car_rental', bicycle_rental: 'bike_rental' },
  shop: { mall: 'malls', supermarket: 'supermarkets', convenience: 'convenience', gift: 'souvenirs', souvenir: 'souvenirs', bakery: 'bakeries' },
  historic: { monument: 'historical', memorial: 'historical', castle: 'historical', ruins: 'historical', archaeological_site: 'historical' },
  leisure: { park: 'parks_nature', garden: 'parks_nature' },
  natural: { beach: 'parks_nature' },
  railway: { station: 'train_stations', subway_entrance: 'metro_subway' },
  highway: { bus_stop: 'bus_stops' },
  aeroway: { aerodrome: 'airports' },
};

interface OverpassTagRecord {
  [key: string]: string | undefined;
}

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: OverpassTagRecord;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

function classifyElement(tags: OverpassTagRecord): { type: string; category: string } {
  for (const [tagKey, valueMap] of Object.entries(TAG_TO_CATEGORY)) {
    const tagValue = tags[tagKey];
    if (tagValue && valueMap[tagValue]) {
      return { type: tagValue, category: valueMap[tagValue] };
    }
  }
  return { type: 'unknown', category: 'unknown' };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius') || '2000';
  const categoriesParam = searchParams.get('categories') || searchParams.get('category') || 'tourist_attractions';
  const limit = searchParams.get('limit') || '50';

  const availableCategories = getAllCategories().map(cat => cat.id);
  const categoryIds = categoriesParam.split(',').map(c => c.trim()).filter(Boolean);

  if (!lat || !lon || isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
    return Response.json({ error: 'Valid "lat" and "lon" query parameters are required', available_categories: availableCategories } as ErrorResponse, { status: 400 });
  }

  const radiusNum = parseInt(radius);
  if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 50000) {
    return Response.json({ error: 'Radius must be between 1 and 50000 meters', available_categories: availableCategories } as ErrorResponse, { status: 400 });
  }

  const limitNum = parseInt(limit);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
    return Response.json({ error: 'Limit must be between 1 and 200', available_categories: availableCategories } as ErrorResponse, { status: 400 });
  }

  const validCategories = categoryIds.filter(id => getCategoryById(id));
  if (validCategories.length === 0) {
    return Response.json({ error: `No valid categories found. Use one or more of: ${availableCategories.join(', ')}`, available_categories: availableCategories } as ErrorResponse, { status: 400 });
  }

  const cacheKey = `${lat},${lon},${radiusNum},${validCategories.sort().join(',')}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📦 Cache hit for nearby places at ${lat},${lon}`);
    return Response.json(cached.data, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    });
  }

  try {
    const overpassQuery = buildMultiCategoryOverpassQuery(validCategories, parseFloat(lat), parseFloat(lon), radiusNum, limitNum);

    console.log(`🔍 Searching for [${validCategories.join(', ')}] near ${lat}, ${lon}`);
    console.log(`📏 Radius: ${radius}m, Limit: ${limit}`);

    const overpassServers = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];

    let response: Response | null = null;
    let lastError: Error | null = null;

    for (const server of overpassServers) {
      const url = `${server}?data=${encodeURIComponent(overpassQuery)}`;
      console.log(`🛰️ Trying: ${server}`);
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': `TravelBuddy/1.0 (${process.env.NOMINATIM_CONTACT_EMAIL ?? 'your-real-email@example.com'})`,
            'Accept': 'application/json',
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(25000),
        });

        if (response.ok) break;

        const errorText = await response.text();
        console.error(`${server} error: ${response.status}`, errorText.slice(0, 200));
        lastError = new Error(`Overpass API error: ${response.status}`);
        response = null;
      } catch (err) {
        console.error(`${server} failed:`, err instanceof Error ? err.message : err);
        lastError = err instanceof Error ? err : new Error(String(err));
        response = null;
      }
    }

    if (!response) {
      throw lastError ?? new Error('All Overpass servers unavailable');
    }

    const data = (await response.json()) as OverpassResponse;

    const places: NearbyPlace[] = (data.elements || [])
      .filter((element: OverpassElement) => {
        const hasCoords = (element.lat && element.lon) || (element.center?.lat && element.center?.lon);
        const hasName = element.tags?.name;
        return hasCoords && hasName;
      })
      .map((element: OverpassElement) => {
        const tags: OverpassTagRecord = element.tags || {};
        const { type: mainType, category: detectedCategory } = classifyElement(tags);

        const subcategory = tags.cuisine || tags.shop || tags.historic || tags.tourism || '';

        let address = '';
        if (tags['addr:full']) {
          address = tags['addr:full'];
        } else {
          const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:postcode']].filter(Boolean);
          address = parts.join(', ');
        }

        return {
          id: element.id.toString(),
          name: tags.name || tags.operator || `Unnamed ${mainType}`,
          lat: Number(element.lat ?? element.center?.lat ?? 0),
          lon: Number(element.lon ?? element.center?.lon ?? 0),
          type: mainType,
          category: detectedCategory,
          subcategory: subcategory || undefined,
          address: address || undefined,
          amenity: tags.amenity || undefined,
        };
      })
      .slice(0, limitNum);

    console.log(`✅ Found ${places.length} places across [${validCategories.join(', ')}]`);

    const responseData: NearbyResponse = {
      places,
      category_info: {
        requested_categories: validCategories,
        total_results: places.length,
      },
      available_categories: availableCategories,
    };

    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    if (cache.size > 50) {
      const now = Date.now();
      for (const [key, val] of cache) {
        if (now - val.timestamp > CACHE_DURATION) cache.delete(key);
      }
    }

    return Response.json(responseData, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    });

  } catch (error) {
    console.error('❌ Nearby API Error:', error);

    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - the search took too long';
      } else if (error.message.includes('Overpass')) {
        errorMessage = 'External mapping service temporarily unavailable. Please try again.';
      } else {
        errorMessage = error.message;
      }
    }

    return Response.json({ error: errorMessage, available_categories: availableCategories } as ErrorResponse, { status: 500 });
  }
}
