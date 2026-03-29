import { NextRequest, NextResponse } from 'next/server';
import { callGroq, validateRequiredFields } from '@/app/lib/groq';
import type { ItineraryRequest, ItineraryResponse, ErrorResponse } from '@/app/types/api';

/**
 * POST /api/itinerary
 * Generate a detailed day-by-day itinerary using Groq LLaMA 3
 * 
 * Request Body:
 * - destination: string (required)
 * - days: number (required)
 * - interests: string[] (required)
 * 
 * Response:
 * - itinerary: Array<{ day: number, activities: string[] }>
 */
export async function POST(request: NextRequest) {
  try {
    const body: ItineraryRequest = await request.json();
    
    // Validate required fields
    const missingFields = validateRequiredFields(body, [
      'destination', 'days', 'interests'
    ]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          details: `Required: ${missingFields.join(', ')}` 
        } as ErrorResponse,
        { status: 400 }
      );
    }

    const { destination, days, interests } = body;

    // Validate days is a positive number
    if (!Number.isInteger(days) || days <= 0 || days > 30) {
      return NextResponse.json(
        { 
          error: 'Invalid days value', 
          details: 'Days must be a positive integer between 1 and 30' 
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Create system prompt for itinerary planning
    const systemPrompt = `You are a professional travel itinerary planner. Create detailed, realistic day-by-day schedules 
    that optimize travel time, consider opening hours, and balance activities with rest. Always include specific timing, 
    locations, and practical details like transportation between activities.`;

    // Create user prompt
    const userPrompt = `Create a ${days}-day detailed itinerary for ${destination} based on these interests: ${interests.join(', ')}.

    Requirements:
    - Provide exactly ${days} days of activities
    - Each day should have 4-6 specific activities
    - Include timing suggestions (morning, afternoon, evening)
    - Consider travel time between locations
    - Mix must-see attractions with local experiences
    - Include meal suggestions and rest breaks
    - Provide brief descriptions for each activity

    Format your response as a structured day-by-day breakdown. For each day, list the activities as separate bullet points.
    
    Example format:
    Day 1:
    • Morning: Visit [Location] - [Brief description]
    • Late Morning: [Activity] - [Brief description]
    • Afternoon: [Activity] - [Brief description]
    • etc.`;

    // Call Groq API
    const itineraryResponse = await callGroq(userPrompt, systemPrompt, 0.6);

    // Parse the response to extract structured data
    const itinerary = parseItineraryResponse(itineraryResponse, days);

    const response: ItineraryResponse = {
      itinerary
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in /api/itinerary:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'Failed to generate itinerary',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Parse the LLM response and extract structured itinerary data
 * @param response - Raw LLM response text
 * @param expectedDays - Expected number of days
 * @returns Array of day objects with activities
 */
function parseItineraryResponse(response: string, expectedDays: number) {
  const itinerary = [];
  const lines = response.split('\n');
  
  let currentDay = 0;
  let currentActivities: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check for day headers (Day 1:, Day 2:, etc.)
    const dayMatch = trimmedLine.match(/^Day (\d+):?/i);
    if (dayMatch) {
      // Save previous day if it exists
      if (currentDay > 0 && currentActivities.length > 0) {
        itinerary.push({
          day: currentDay,
          activities: [...currentActivities]
        });
      }
      
      // Start new day
      currentDay = parseInt(dayMatch[1]);
      currentActivities = [];
      continue;
    }
    
    // Check for activities (lines starting with •, -, *, or numbers)
    if (trimmedLine.match(/^[•\-\*\d]/)) {
      // Clean up the activity text
      const activity = trimmedLine.replace(/^[•\-\*\d\.\)\s]+/, '').trim();
      if (activity) {
        currentActivities.push(activity);
      }
    }
  }
  
  // Add the last day
  if (currentDay > 0 && currentActivities.length > 0) {
    itinerary.push({
      day: currentDay,
      activities: [...currentActivities]
    });
  }

  // Ensure we have the expected number of days
  while (itinerary.length < expectedDays) {
    itinerary.push({
      day: itinerary.length + 1,
      activities: ['Free time / Flexible day for personal exploration']
    });
  }

  return itinerary.slice(0, expectedDays);
}