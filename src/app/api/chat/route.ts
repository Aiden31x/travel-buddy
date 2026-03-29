import { NextRequest, NextResponse } from 'next/server';
import { callGroq, validateRequiredFields } from '@/app/lib/groq';
import type { ChatRequest, ChatResponse, ErrorResponse } from '@/app/types/api';

/**
 * POST /api/chat
 * General chat endpoint for travel advice using Groq LLaMA 3
 * 
 * Request Body:
 * - message: string (required)
 * - context?: string (optional context from previous conversations)
 * 
 * Response:
 * - reply: string (LLM's response)
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    
    // Validate required fields
    const missingFields = validateRequiredFields(body, ['message']);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          details: `Required: ${missingFields.join(', ')}` 
        } as ErrorResponse,
        { status: 400 }
      );
    }

    const { message, context } = body;

    // Create system prompt for travel chat
    const systemPrompt = `You are a knowledgeable and friendly travel assistant. You help users with:
    - Travel planning and destination advice
    - Local customs, culture, and etiquette
    - Transportation and accommodation recommendations
    - Food and dining suggestions
    - Activities and attractions
    - Budget planning and money-saving tips
    - Travel safety and health considerations
    - Visa, documentation, and travel requirements
    - Weather and best times to visit
    - Local language tips and communication
    
    Always provide helpful, accurate, and practical advice. Be conversational but informative. 
    If you're not sure about current information (like visa requirements or travel restrictions), 
    advise the user to check official sources.`;

    // Prepare user prompt with context if provided
    let userPrompt = message;
    if (context) {
      userPrompt = `Context from our previous conversation:\n${context}\n\nCurrent question: ${message}`;
    }

    // Call Groq API
    const reply = await callGroq(userPrompt, systemPrompt, 0.8);

    const response: ChatResponse = {
      reply
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in /api/chat:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}