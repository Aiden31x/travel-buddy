// /app/api/foursquare/autocomplete/route.ts
export async function GET(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
      const query = searchParams.get("query");
      const lat = searchParams.get("lat");
      const lng = searchParams.get("lng");
      const radius = searchParams.get("radius") || "5000"; // Default 5km
      const types = searchParams.get("types") || "place"; // Default to places only
      const bias = searchParams.get("bias");
      const sessionToken = searchParams.get("session_token");
      const limit = searchParams.get("limit") || "10";
  
      // Validate required parameters
      if (!query) {
        return new Response(JSON.stringify({ 
          error: "Query parameter is required" 
        }), { status: 400 });
      }
  
      if (query.length < 3) {
        return new Response(JSON.stringify({ 
          error: "Query must be at least 3 characters long" 
        }), { status: 400 });
      }
  
      // Build the search URL (using search endpoint for autocomplete behavior)
      const params = new URLSearchParams({
        query, // This is required and acts as the autocomplete term
        radius,
        limit,
        // Minimal fields for autocomplete - just what's needed for suggestions
        fields: 'fsq_place_id,name,location,categories'
      });
  
      // Add location if provided
      if (lat && lng) {
        params.append('ll', `${lat},${lng}`);
      }
  
      // Note: types, bias, session_token are not used in search endpoint
      // The search endpoint with query parameter provides autocomplete-like behavior
  
      const url = `https://places-api.foursquare.com/places/search?${params.toString()}`;
  
      console.log('🔍 Foursquare Search (Autocomplete Style):');
      console.log('💬 Query:', query);
      console.log('📍 Location:', lat && lng ? `${lat}, ${lng}` : 'IP-based location');
      console.log('📏 Radius:', `${radius}m`);
      console.log('🎯 Autocomplete limit:', limit);
      console.log('🔗 URL:', url);
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
        console.error(`❌ Foursquare Autocomplete Error: ${response.status} - ${errorText}`);
        throw new Error(`Foursquare API error: ${response.status} - ${errorText}`);
      }
  
      const data = await response.json();
      
      console.log('📦 Raw Search Response (for autocomplete):');
      console.log('Total suggestions:', data.results?.length || 0);
      console.log('Raw data:', JSON.stringify(data, null, 2));
      console.log('');
  
      // Transform search results into autocomplete-style suggestions
      const transformedResults = data.results?.map((place: any, index: number) => {
        console.log(`💡 Suggestion #${index + 1}:`);
        console.log('Raw place data:', JSON.stringify(place, null, 2));
        
        const transformed = {
          // Autocomplete suggestion data
          id: place.fsq_place_id || 'No ID',
          display_text: place.name || 'Unknown Place',
          category: place.categories?.[0]?.name || 'Unknown Category',
          
          // Location info for the suggestion
          address: place.location?.formatted_address || 'Address not available',
          coordinates: {
            lat: place.latitude ? parseFloat(place.latitude) : null,
            lng: place.longitude ? parseFloat(place.longitude) : null,
          },
          
          // Suggestion metadata
          suggestion_type: 'place', // Since we're using search endpoint, all results are places
          match_confidence: 'high', // Search endpoint typically returns good matches
          
          // Raw for debugging
          _raw: place
        };
        
        // Clean console output
        console.log(`   💡 ${transformed.display_text}`);
        console.log(`   🏷️  ${transformed.category}`);
        console.log(`   📧 ${transformed.address}`);
        console.log('   ─────────────────────────────────────');
        
        return transformed;
      }) || [];
  
      // Create clean response
      const cleanResponse = {
        success: true,
        autocomplete_metadata: {
          query: query,
          location: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null,
          radius_meters: parseInt(radius),
          result_limit: parseInt(limit),
          timestamp: new Date().toISOString(),
        },
        suggestions: transformedResults,
        summary: {
          total_suggestions: transformedResults.length,
          categories_found: [...new Set(transformedResults.map(s => s.category))],
          search_completed_at: new Date().toISOString(),
        }
      };
  
      // Log summary
      console.log('📊 AUTOCOMPLETE-STYLE SEARCH SUMMARY:');
      console.log(`   💬 Query: "${query}"`);
      console.log(`   💡 Found ${cleanResponse.summary.total_suggestions} suggestions`);
      console.log(`   🏷️  Categories: ${cleanResponse.summary.categories_found.join(', ')}`);
      console.log(`   ✅ Search completed successfully!`);
  
      return new Response(JSON.stringify(cleanResponse, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      });
  
    } catch (err: any) {
      console.error('❌ Autocomplete Error:', err.message);
      return new Response(JSON.stringify({ 
        success: false,
        error: err.message,
        type: 'autocomplete_error',
        timestamp: new Date().toISOString()
      }, null, 2), { status: 500 });
    }
  }