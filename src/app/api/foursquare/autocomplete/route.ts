
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const limit = searchParams.get("limit") || "5";

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ predictions: [] }), { status: 200 });
    }

    // Build URL for autocomplete
    let url = `https://places-api.foursquare.com/autocomplete?query=${encodeURIComponent(query)}&limit=${limit}`;
    
    if (lat && lng) {
      url += `&ll=${lat},${lng}`;
    }

    console.log('Autocomplete request to:', url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.FOURSQUARE_SERVICE_KEY!}`,
        Accept: "application/json",
        "X-Places-Api-Version": "2025-06-17",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Foursquare API error: ${response.status} - ${errorText}`);
      throw new Error(`Foursquare API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Transform to match your existing frontend format
    const predictions = data.results?.map((place: any) => ({
      place_id: place.fsq_place_id,
      description: `${place.name}, ${place.location?.formatted_address || place.location?.locality || ''}`,
      lat: place.latitude?.toString(),
      lon: place.longitude?.toString(),
      type: place.categories?.[0]?.name || 'place',
      name: place.name,
    })) || [];

    return new Response(JSON.stringify({ predictions }), { status: 200 });

  } catch (err: any) {
    console.error('Autocomplete error:', err);
    return new Response(JSON.stringify({ 
      error: err.message,
      type: 'autocomplete_error'
    }), { status: 500 });
  }
}