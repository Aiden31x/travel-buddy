import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/app/lib/gemini";

/**
 * POST /api/ai/packing-list
 * Generates a personalized packing list using Gemini.
 */
export async function POST(request: NextRequest) {
  try {
    const { destination, days, budget, activities, weather } = await request.json();

    if (!destination) {
      return NextResponse.json({ error: "destination is required" }, { status: 400 });
    }

    const weatherInfo = weather?.length
      ? `Weather forecast: ${weather.map((w: any) => `${w.date}: ${w.description}, ${w.tempMin}°-${w.tempMax}°C`).join("; ")}`
      : "No weather data available.";

    const activitiesInfo = activities?.length
      ? `Planned activities: ${activities.join(", ")}`
      : "";

    const prompt = `Generate a packing list for a ${days || 3}-day trip to ${destination} with a ${budget || "moderate"} budget.

${weatherInfo}
${activitiesInfo}

Respond with ONLY valid JSON in this exact format:
{
  "categories": [
    {
      "name": "Clothing",
      "items": [
        { "item": "Light jacket", "essential": true },
        { "item": "Sunglasses", "essential": false }
      ]
    }
  ]
}

Include categories: Clothing, Toiletries, Electronics, Documents, Health & Safety, and Extras.
Mark truly essential items (passport, meds, charger) as essential: true.
Be specific to the destination and weather. Keep it practical — 20-35 items total.`;

    const raw = await callGemini(prompt, "You are a travel packing expert. Return only valid JSON.", 0.4);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ success: true, ...parsed });
  } catch (err) {
    console.error("Packing list error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate packing list" },
      { status: 500 }
    );
  }
}
