export interface PlanRequest {
    destination: string;
    dates: string;
    budget: string;
    interests: string[];
  }
  
  export interface ItineraryRequest {
    destination: string;
    days: number;
    interests: string[];
  }
  
  export interface ChatRequest {
    message: string;
    context?: string;
  }
  
  // Response Types
  export interface PlanResponse {
    plan: string;
    summary: string;
  }
  
  export interface ItineraryResponse {
    itinerary: Array<{
      day: number;
      activities: string[];
    }>;
  }
  
  export interface ChatResponse {
    reply: string;
  }
  
  // Error Response Type
  export interface ErrorResponse {
    error: string;
    details?: string;
  }