import type { NextRequest } from 'next/server';

interface PlaceDetails {
  place_id: string;
  name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    city?: string;
    country?: string;
    postcode?: string;
  };
  opening_hours?: string;
  website?: string;
}

interface DetailsResponse {
  details: PlaceDetails;
}

interface ErrorResponse {
  error: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('place_id');

  if (!placeId) {
    return new Response(JSON.stringify({ error: 'Query parameter "place_id" is required' } as ErrorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/details?place_id=${encodeURIComponent(placeId)}&format=json`;
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'TravelBuddy/1.0 (your.email@example.com)', // Replace with your email
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json(); // Raw response can vary

    // Determine name from available fields
    let name = 'Unnamed Place';
    if (data.namedetails?.name) {
      name = data.namedetails.name;
    } else if (data.address?.city || data.address?.town) {
      name = data.address.city || data.address.town;
    } else if (data.display_name) {
      name = data.display_name.split(',')[0] || name;
    }

    // Map to structured output
    const details: PlaceDetails = {
      place_id: placeId,
      name,
      lat: data.centroid?.coordinates?.[1] || '0',
      lon: data.centroid?.coordinates?.[0] || '0',
      address: {
        road: data.address?.road || undefined,
        city: data.address?.city || data.address?.town || undefined,
        country: data.address?.country || undefined,
        postcode: data.address?.postcode || undefined,
      },
      opening_hours: data.opening_hours || undefined,
      website: data.website || undefined,
    };

    return new Response(JSON.stringify({ details } as DetailsResponse), {
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