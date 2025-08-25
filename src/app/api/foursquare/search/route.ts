// /app/api/foursquare/search/route.ts
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius") || "10000";
    const limit = searchParams.get("limit") || "20";
    const categories = searchParams.get("categories");

    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: "Missing lat/lng coordinates" }), { status: 400 });
    }

    // Build the URL with minimal fields to save API credits
    const params = new URLSearchParams({
      ll: `${lat},${lng}`,
      radius,
      limit,
      // Only absolute essentials - name, location, category
      fields: 'fsq_place_id,name,latitude,longitude,location,categories'
    });
    
    if (query) {
      params.append('query', query);
    }
    
    if (categories) {
      params.append('categories', categories);
    }
    
    const url = `https://places-api.foursquare.com/places/search?${params.toString()}`;

    console.log('🔍 Making Foursquare API Request:');
    console.log('📍 Search Query:', query || 'No specific query');
    console.log('🌍 Coordinates:', `${lat}, ${lng}`);
    console.log('📏 Radius:', `${radius}m`);
    console.log('🎯 Categories:', categories || 'All categories');
    console.log('🔗 Full URL:', url);
    console.log('');

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.FOURSQUARE_SERVICE_KEY!}`,
        Accept: "application/json",
        "X-Places-Api-Version": "2025-06-17",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Foursquare API Error: ${response.status} - ${errorText}`);
      throw new Error(`Foursquare API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Log raw response for debugging
    console.log('📦 Raw API Response:');
    console.log('Total results found:', data.results?.length || 0);
    console.log('Raw data structure:', JSON.stringify(data, null, 2));
    console.log('');

    // Transform and clean the response
    const transformedResults = data.results?.map((place: any, index: number) => {
      console.log(`🏪 Processing Place #${index + 1}:`);
      console.log('Raw place data:', JSON.stringify(place, null, 2));
      
      const transformed = {
        // Basic Info Only
        id: place.fsq_place_id || 'No ID',
        name: place.name || 'Unknown Place',
        category: place.categories?.[0]?.name || 'Unknown Category',
        
        // Location Data
        coordinates: {
          lat: place.latitude ? parseFloat(place.latitude) : 0,
          lng: place.longitude ? parseFloat(place.longitude) : 0,
        },
        
        // Address Information  
        address: place.location?.formatted_address || 'Address not available',
        
        // Raw data for debugging
        _raw: place
      };
      
      // Pretty print each transformed place
      console.log('✅ Place found:');
      console.log(`   📍 ${transformed.name}`);
      console.log(`   🏷️  ${transformed.category}`);
      console.log(`   📧 ${transformed.address}`);
      console.log(`   🗺️  Lat: ${transformed.coordinates.lat}, Lng: ${transformed.coordinates.lng}`);
      console.log('   ─────────────────────────────────────');
      
      return transformed;
    }) || [];

    // Create a comprehensive response structure
    const cleanResponse = {
      success: true,
      search_metadata: {
        query: query || null,
        location: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          radius_meters: parseInt(radius),
        },
        filters: {
          categories: categories || 'all',
          limit: parseInt(limit),
        },
        timestamp: new Date().toISOString(),
      },
      results: transformedResults,
      summary: {
        total_places_found: transformedResults.length,
        categories_found: [...new Set(transformedResults.map(p => p.category))],
        search_completed_at: new Date().toISOString(),
      }
    };

    // Log the final clean summary
    console.log('📊 SEARCH SUMMARY:');
    console.log(`   Found ${cleanResponse.summary.total_places_found} places`);
    console.log(`   Categories: ${cleanResponse.summary.categories_found.join(', ')}`);
    console.log(`   ✅ Search completed successfully!`);

    return new Response(JSON.stringify(cleanResponse, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (err: any) {
    console.error('❌ Search Error:', err.message);
    return new Response(JSON.stringify({ 
      success: false,
      error: err.message,
      type: 'search_error',
      timestamp: new Date().toISOString()
    }, null, 2), { status: 500 });
  }
}