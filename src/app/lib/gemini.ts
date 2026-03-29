/**
 * Google Gemini API integration helper
 * Uses the REST API directly (no SDK) — mirrors the groq.ts pattern
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.5-flash';

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: { text: string; thought?: boolean }[];
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export async function callGemini(
  prompt: string,
  systemPrompt?: string,
  temperature: number = 0.7
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const contents: GeminiContent[] = [];

  if (systemPrompt) {
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }],
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood. I will follow these instructions.' }],
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: 4096,
          topP: 1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const parts = data.candidates[0].content.parts;
    const textPart = parts.find((p) => !p.thought && p.text) || parts[0];
    return (textPart?.text ?? '').trim();
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}
