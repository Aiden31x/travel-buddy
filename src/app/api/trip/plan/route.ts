// /app/api/trip/plan/route.ts
import type { NextRequest } from 'next/server';

// Simplified input types - places already have coordinates from frontend selection
interface TripPlanRequest {
  destination: {
    name: string;
    lat: string;
    lon: string;
  };
  places: {
    name: string;
    lat: string;
    lon: string;
    type?: string;
  }[];
  days: number;
  budget: 'low' | 'moderate' | 'luxury';
}

// Final itinerary output - already enriched with coordinates
interface EnrichedItinerary {
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

interface PlanResponse {
  success: true;
  itinerary: EnrichedItinerary;
  llm_info: {
    model: string;
    tokens_used?: number;
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

// Rate limiting for Groq API
let lastGroqRequest = 0;
const MIN_GROQ_INTERVAL = 1000; // 1 second between requests

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate JSON body
    let tripRequest: TripPlanRequest;
    try {
      tripRequest = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body' 
      } as ErrorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields
    const { destination, places, days, budget } = tripRequest;
    const errors: string[] = [];

    if (!destination?.name || !destination?.lat || !destination?.lon) {
      errors.push('Destination must include name, lat, and lon');
    }

    if (!Array.isArray(places) || places.length === 0) {
      errors.push('Places must be a non-empty array');
    } else {
      places.forEach((place, index) => {
        if (!place.name || !place.lat || !place.lon) {
          errors.push(`Place ${index + 1} must include name, lat, and lon`);
        }
      });
    }

    if (!days || days <= 0 || days > 30) {
      errors.push('Days must be between 1 and 30');
    }

    if (!['low', 'moderate', 'luxury'].includes(budget)) {
      errors.push('Budget must be: low, moderate, or luxury');
    }

    if (errors.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed',
        details: errors.join(', ')
      } as ErrorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`🤖 Generating itinerary for ${destination.name} (${days} days, ${budget} budget)`);
    console.log(`📍 Selected places: ${places.map(p => p.name).join(', ')}`);

    // Build enhanced prompt for better itinerary planning
    const systemPrompt = `You are an expert travel planner assistant. Create detailed day-by-day itineraries that are practical and enjoyable.

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY valid JSON in the exact format specified
2. Include ALL provided places across the specified days
3. Distribute places logically across days (don't overcrowd)
4. Consider travel time and location proximity
5. Assign appropriate times: morning (9AM-12PM), afternoon (12PM-6PM), evening (6PM-10PM)

Budget Guidelines:
- low: Focus on free attractions, street food, walking, public transport
- moderate: Mix of paid attractions, casual dining, some taxi rides
- luxury: Premium experiences, fine dining, private transport, exclusive tours

Response Format: Return ONLY valid JSON with no additional text or explanations.`;

    const userPrompt = `Create a ${days}-day travel itinerary for ${destination.name} with a ${budget} budget.

Places to include (with coordinates):
${places.map(place => `- ${place.name} (${place.lat}, ${place.lon}) ${place.type ? `[${place.type}]` : ''}`).join('\n')}

Requirements:
1. Include ALL ${places.length} places across ${days} days
2. Distribute places logically by proximity and travel time
3. Each day should have 2-4 activities maximum
4. Consider ${budget} budget constraints
5. Assign morning, afternoon, or evening times appropriately

Respond with this EXACT JSON format:
{
  "destination": "${destination.name}",
  "days": ${days},
  "budget": "${budget}",
  "itinerary": [
    {
      "day": 1,
      "places": [
        {
          "name": "Exact Place Name",
          "lat": "coordinates from input", 
          "lon": "coordinates from input",
          "time": "morning",
          "type": "attraction type if available"
        }
      ]
    }
  ]
}

Important: Use the EXACT place names and coordinates I provided above.`;

    // Rate limiting for Groq API
    const now = Date.now();
    const timeSinceLastRequest = now - lastGroqRequest;
    if (timeSinceLastRequest < MIN_GROQ_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_GROQ_INTERVAL - timeSinceLastRequest));
    }

    // Call Groq API
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return new Response(JSON.stringify({ 
        error: 'Groq API key not configured',
        details: 'Please set GROQ_API_KEY environment variable'
      } as ErrorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`🚀 Calling Groq API for itinerary generation...`);

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
        temperature: 0.3, // Lower temperature for more consistent output
        max_tokens: 4000,
        top_p: 1,
        stream: false
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    lastGroqRequest = Date.now();

    if (!groqResponse.ok) {
      const groqError = await groqResponse.text();
      console.error('Groq API error:', groqError);
      
      if (groqResponse.status === 401) {
        return new Response(JSON.stringify({ 
          error: 'Groq API authentication failed',
          details: 'Invalid API key'
        } as ErrorResponse), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (groqResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Too many requests to AI service',
          details: 'Please wait a moment and try again'
        } as ErrorResponse), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const groqData = await groqResponse.json();
    const llmResponse = groqData.choices?.[0]?.message?.content;

    if (!llmResponse) {
      return new Response(JSON.stringify({ 
        error: 'Empty response from AI service',
        details: 'The AI failed to generate an itinerary'
      } as ErrorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`🤖 Raw LLM Response preview:`, llmResponse.substring(0, 200) + '...');

    // Parse and validate LLM JSON response
    let itinerary: EnrichedItinerary;
    try {
      // Clean the response (remove any potential markdown code blocks)
      const cleanedResponse = llmResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      itinerary = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse LLM JSON:', parseError);
      console.error('❌ Raw response:', llmResponse);
      return new Response(JSON.stringify({ 
        error: 'AI returned invalid response format',
        details: 'The AI generated malformed JSON. Please try again.'
      } as ErrorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate LLM response structure
    if (!itinerary.destination || !itinerary.days || !itinerary.budget || !Array.isArray(itinerary.itinerary)) {
      return new Response(JSON.stringify({ 
        error: 'AI returned incomplete itinerary',
        details: 'Missing required fields: destination, days, budget, or itinerary array'
      } as ErrorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate that coordinates are preserved
    const hasValidCoordinates = itinerary.itinerary.every(day => 
      day.places.every(place => place.lat && place.lon)
    );

    if (!hasValidCoordinates) {
      console.log('⚠️ Some places missing coordinates, using input coordinates as fallback');
      
      // Fix missing coordinates by using input data
      itinerary.itinerary.forEach(day => {
        day.places.forEach(place => {
          if (!place.lat || !place.lon) {
            const inputPlace = places.find(p => 
              p.name.toLowerCase().includes(place.name.toLowerCase()) ||
              place.name.toLowerCase().includes(p.name.toLowerCase())
            );
            if (inputPlace) {
              place.lat = inputPlace.lat;
              place.lon = inputPlace.lon;
              place.type = inputPlace.type;
            }
          }
        });
      });
    }

    const generationTime = Date.now() - startTime;
    
    console.log(`✅ Successfully generated ${days}-day itinerary with coordinates in ${generationTime}ms`);

    const response: PlanResponse = {
      success: true,
      itinerary,
      llm_info: {
        model: GROQ_MODEL,
        tokens_used: groqData.usage?.total_tokens,
        generation_time: generationTime,
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache', // Don't cache generated itineraries
      },
    });

  } catch (error) {
    const generationTime = Date.now() - startTime;
    console.error('❌ Trip planning error:', error);
    
    let errorMessage = 'Internal server error during itinerary generation';
    let details = undefined;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'AI service timeout - the request took too long';
        details = 'Please try again with fewer places or shorter trip duration';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Failed to connect to AI service';
        details = 'Please check your internet connection and try again';
      } else if (error.message.includes('Groq')) {
        errorMessage = 'AI service temporarily unavailable';
        details = 'Please try again in a few minutes';
      }
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      details 
    } as ErrorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}