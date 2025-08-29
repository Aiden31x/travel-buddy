// /app/api/trip/create/route.ts
import type { NextRequest } from 'next/server';

// Input types - places already selected from map with coordinates
interface TripCreateRequest {
  destination: {
    name: string;
    lat: string;
    lon: string;
  };
  selectedPlaces: {
    name: string;
    lat: string;
    lon: string;
    type?: string;
    id?: string;
  }[];
  days: number;
  budget: 'low' | 'moderate' | 'luxury';
}

// Output - complete itinerary ready for frontend
interface CompleteItinerary {
  destination: string;
  days: number;
  budget: string;
  itinerary: {
    day: number;
    places: {
      name: string;
      lat: string;
      lon: string;
      time: 'morning' | 'afternoon' | 'evening';
      type?: string;
    }[];
  }[];
}

interface CreateResponse {
  success: true;
  itinerary: CompleteItinerary;
  planning_info: {
    model: string;
    places_included: number;
    generation_time: number;
  };
}

interface ErrorResponse {
  error: string;
  details?: string;
}

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama3-70b-8192';

// Rate limiting
let lastGroqRequest = 0;
const MIN_GROQ_INTERVAL = 1000;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    let tripData: TripCreateRequest;
    try {
      tripData = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body' 
      } as ErrorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate input
    const { destination, selectedPlaces, days, budget } = tripData;
    const errors: string[] = [];

    if (!destination?.name || !destination?.lat || !destination?.lon) {
      errors.push('Destination must include name, latitude, and longitude');
    }

    if (!Array.isArray(selectedPlaces) || selectedPlaces.length === 0) {
      errors.push('Selected places cannot be empty');
    } else if (selectedPlaces.length > 20) {
      errors.push('Maximum 20 places allowed per trip');
    }

    selectedPlaces.forEach((place, index) => {
      if (!place.name || !place.lat || !place.lon) {
        errors.push(`Place ${index + 1} (${place.name || 'unnamed'}) missing required coordinates`);
      }
    });

    if (!days || typeof days !== 'number' || days <= 0 || days > 30) {
      errors.push('Days must be a number between 1 and 30');
    }

    if (!['low', 'moderate', 'luxury'].includes(budget)) {
      errors.push('Budget must be one of: low, moderate, luxury');
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

    console.log(`🎯 Planning ${days}-day ${budget} trip to ${destination.name}`);
    console.log(`📋 Including ${selectedPlaces.length} user-selected places`);

    // Build optimized prompt for LLM
    const systemPrompt = `You are an expert travel planner. Create practical day-by-day itineraries.

CRITICAL: Respond with ONLY valid JSON. No markdown, no explanations, just the JSON structure.

Budget Guidelines:
- low ($0-50/day): Free attractions, local food, walking tours, public transport
- moderate ($50-150/day): Mix of paid/free attractions, casual dining, occasional taxis  
- luxury ($150+/day): Premium attractions, fine dining, private transport, guided tours

Time Slots:
- morning: 9:00 AM - 12:00 PM (start with popular attractions to avoid crowds)
- afternoon: 12:00 PM - 6:00 PM (main sightseeing time)  
- evening: 6:00 PM - 10:00 PM (dining, nightlife, sunset views)

Planning Rules:
1. Include ALL provided places
2. Group nearby places on same days to minimize travel
3. Don't overcrowd days (max 4 places per day)
4. Consider opening hours and crowd patterns
5. Leave time for meals and rest`;

    const placesInfo = selectedPlaces.map(place => 
      `${place.name} (${place.lat}, ${place.lon}) ${place.type ? `[${place.type}]` : ''}`
    ).join('\n');

    const userPrompt = `Plan a ${days}-day trip to ${destination.name} with ${budget} budget.

Selected Places:
${placesInfo}

Create an itinerary that includes ALL these ${selectedPlaces.length} places distributed across ${days} days.

Respond with ONLY this JSON format:
{
  "destination": "${destination.name}",
  "days": ${days},
  "budget": "${budget}",
  "itinerary": [
    {
      "day": 1,
      "places": [
        {
          "name": "Place Name",
          "lat": "exact_latitude",
          "lon": "exact_longitude", 
          "time": "morning",
          "type": "attraction_type"
        }
      ]
    }
  ]
}

Use EXACT coordinates and names from the places list above.`;

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastGroqRequest;
    if (timeSinceLastRequest < MIN_GROQ_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_GROQ_INTERVAL - timeSinceLastRequest));
    }

    // Call Groq LLM
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return new Response(JSON.stringify({ 
        error: 'Groq API key not configured' 
      } as ErrorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        top_p: 1,
        stream: false
      }),
      signal: AbortSignal.timeout(45000),
    });

    lastGroqRequest = Date.now();

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', errorText);
      
      return new Response(JSON.stringify({ 
        error: 'AI service error',
        details: groqResponse.status === 429 ? 'Rate limit exceeded' : 'AI service unavailable'
      } as ErrorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const groqData = await groqResponse.json();
    const llmResponse = groqData.choices?.[0]?.message?.content;

    if (!llmResponse) {
      return new Response(JSON.stringify({ 
        error: 'Empty AI response' 
      } as ErrorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse LLM JSON response
    let itinerary: CompleteItinerary;
    try {
      const cleanedResponse = llmResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      itinerary = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('❌ LLM JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'AI returned invalid format',
        details: 'Generated response was not valid JSON'
      } as ErrorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate response structure
    if (!itinerary.destination || !itinerary.itinerary || !Array.isArray(itinerary.itinerary)) {
      return new Response(JSON.stringify({ 
        error: 'AI returned incomplete itinerary' 
      } as ErrorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure all places have coordinates (fallback to input if missing)
    itinerary.itinerary.forEach(day => {
      day.places.forEach(place => {
        if (!place.lat || !place.lon) {
          const originalPlace = selectedPlaces.find(sp => 
            sp.name.toLowerCase().includes(place.name.toLowerCase()) ||
            place.name.toLowerCase().includes(sp.name.toLowerCase())
          );
          if (originalPlace) {
            place.lat = originalPlace.lat;
            place.lon = originalPlace.lon;
            place.type = originalPlace.type;
          }
        }
      });
    });

    const generationTime = Date.now() - startTime;
    console.log(`✅ Trip planning complete in ${generationTime}ms`);

    const response: CreateResponse = {
      success: true,
      itinerary,
      planning_info: {
        model: GROQ_MODEL,
        places_included: selectedPlaces.length,
        generation_time: generationTime,
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('❌ Trip creation error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    } as ErrorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}