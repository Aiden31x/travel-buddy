/**
 * Groq Cloud API integration helper
 * Provides a unified interface for calling Groq's LLaMA 3 API
 */

interface GroqChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }
  
  interface GroqChatRequest {
    model: string;
    messages: GroqChatMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    stream?: boolean;
  }
  
  interface GroqChatResponse {
    choices: Array<{
      message: {
        role: string;
        content: string;
      };
      finish_reason: string;
    }>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }
  
  /**
   * Call Groq Cloud API with a prompt and return the LLM response
   * @param prompt - The user prompt to send to the LLM
   * @param systemPrompt - Optional system prompt to guide the LLM behavior
   * @param temperature - Controls randomness (0-2, default: 0.7)
   * @returns Promise<string> - The LLM's response text
   */
  export async function callGroq(
    prompt: string,
    systemPrompt?: string,
    temperature: number = 0.7
  ): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || 'llama3-70b-8192';
  
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }
  
    // Prepare messages array
    const messages: GroqChatMessage[] = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt
    });
  
    const requestBody: GroqChatRequest = {
      model,
      messages,
      temperature,
      max_tokens: 2048,
      top_p: 1,
      stream: false
    };
  
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error (${response.status}): ${errorText}`);
      }
  
      const data: GroqChatResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Groq API');
      }
  
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Groq API call failed:', error);
      throw error;
    }
  }
  
  /**
   * Validate required fields in request body
   * @param body - Request body object
   * @param requiredFields - Array of required field names
   * @returns Array of missing fields (empty if all present)
   */
  export function validateRequiredFields(
    body: any,
    requiredFields: string[]
  ): string[] {
    const missing: string[] = [];
    
    for (const field of requiredFields) {
      if (!body[field] || (Array.isArray(body[field]) && body[field].length === 0)) {
        missing.push(field);
      }
    }
    
    return missing;
  }