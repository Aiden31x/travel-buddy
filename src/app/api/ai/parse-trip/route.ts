import { NextRequest, NextResponse } from "next/server";
import { callGroq } from "@/app/lib/groq";

/**
 * POST /api/ai/parse-trip
 * Parses natural language trip descriptions into structured parameters using Groq.
 */
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query string is required" }, { status: 400 });
    }

    const systemPrompt = `You are a trip-request parser. Extract structured travel parameters from natural language.

RESPOND WITH ONLY VALID JSON — no extra text, no markdown fences.

Output format:
{
  "destination": "city or place name",
  "days": number (1-14, default 3 if not specified),
  "budget": "low" | "moderate" | "luxury" (default "moderate" if not specified),
  "interests": ["array of interest keywords like food, art, nightlife, nature, history, shopping, adventure"]
}

If the user doesn't mention a destination, set destination to null.`;

    const raw = await callGroq(query, systemPrompt, 0.1);

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      success: true,
      ...parsed,
    });
  } catch (err) {
    console.error("Parse trip error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse trip description" },
      { status: 500 }
    );
  }
}
