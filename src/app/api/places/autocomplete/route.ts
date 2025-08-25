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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return new Response(JSON.stringify({ error: 'Query parameter "q" is required' } as ErrorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`;
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'TravelBuddy/1.0 (your.email@example.com)', // Replace with your email or app info
      },
    });

    if (!response.ok) {
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

    return new Response(JSON.stringify({ predictions } as AutocompleteResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Internal server error' } as ErrorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}