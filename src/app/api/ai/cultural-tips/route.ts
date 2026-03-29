import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/app/lib/gemini";

/**
 * POST /api/ai/cultural-tips
 * Returns cultural etiquette, phrases, safety, and money tips using Gemini.
 */
export async function POST(request: NextRequest) {
  try {
    const { destination } = await request.json();

    if (!destination) {
      return NextResponse.json({ error: "destination is required" }, { status: 400 });
    }

    const prompt = `Provide cultural tips for a traveler visiting ${destination}.

Respond with ONLY valid JSON:
{
  "etiquette": [
    "Tip: description"
  ],
  "phrases": [
    { "local": "phrase in local language", "english": "english meaning", "pronunciation": "phonetic guide" }
  ],
  "safety": [
    "Safety tip"
  ],
  "money": {
    "currency": "ISO code (e.g. EUR)",
    "currencyName": "full name",
    "tipping": "brief tipping culture description",
    "avgMealCost": "approximate cost range for a meal",
    "haggling": "whether bargaining is common"
  }
}

Include 4-6 etiquette tips, 6-8 useful phrases, 3-5 safety tips, and complete money info.
Be specific and practical — avoid generic advice.`;

    const raw = await callGemini(
      prompt,
      "You are a cultural travel advisor. Return only valid JSON with no markdown.",
      0.5
    );
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ success: true, ...parsed });
  } catch (err) {
    console.error("Cultural tips error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate cultural tips" },
      { status: 500 }
    );
  }
}
