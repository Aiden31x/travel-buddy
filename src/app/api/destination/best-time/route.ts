import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/app/lib/gemini";

/**
 * GET /api/destination/best-time?destination=Paris&lat=48.85&lon=2.35
 * Returns monthly climate data (Open-Meteo historical) + AI crowd/price analysis (Gemini).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get("destination");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!destination || !lat || !lon) {
    return NextResponse.json({ error: "destination, lat, and lon are required" }, { status: 400 });
  }

  try {
    // Fetch 3 years of historical data from Open-Meteo
    const endYear = new Date().getFullYear() - 1;
    const startYear = endYear - 2;
    const climateUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startYear}-01-01&end_date=${endYear}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration&timezone=auto`;

    const [climateRes, aiRes] = await Promise.allSettled([
      fetch(climateUrl).then((r) => r.json()),
      callGemini(
        `For ${destination}, provide monthly travel analysis.

Return ONLY valid JSON:
{
  "months": [
    {
      "month": "January",
      "crowdLevel": "low" | "medium" | "high",
      "priceLevel": "low" | "medium" | "high",
      "verdict": "one sentence summary"
    }
  ],
  "bestMonths": ["March", "April"],
  "reasoning": "brief explanation"
}

Cover all 12 months. Be accurate and specific to ${destination}.`,
        "You are a travel data analyst. Return only valid JSON.",
        0.3
      ),
    ]);

    // Process climate data into monthly averages
    const monthlyClimate: {
      month: string;
      avgHigh: number;
      avgLow: number;
      avgRainfall: number;
      avgSunshine: number;
    }[] = [];

    if (climateRes.status === "fulfilled" && climateRes.value?.daily) {
      const daily = climateRes.value.daily;
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];

      for (let m = 0; m < 12; m++) {
        const monthData = {
          highs: [] as number[],
          lows: [] as number[],
          rain: [] as number[],
          sun: [] as number[],
        };

        daily.time.forEach((date: string, i: number) => {
          const d = new Date(date);
          if (d.getMonth() === m) {
            if (daily.temperature_2m_max[i] != null) monthData.highs.push(daily.temperature_2m_max[i]);
            if (daily.temperature_2m_min[i] != null) monthData.lows.push(daily.temperature_2m_min[i]);
            if (daily.precipitation_sum[i] != null) monthData.rain.push(daily.precipitation_sum[i]);
            if (daily.sunshine_duration[i] != null) monthData.sun.push(daily.sunshine_duration[i]);
          }
        });

        const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

        monthlyClimate.push({
          month: monthNames[m],
          avgHigh: Math.round(avg(monthData.highs)),
          avgLow: Math.round(avg(monthData.lows)),
          avgRainfall: Math.round(avg(monthData.rain) * 30), // monthly total estimate
          avgSunshine: Math.round(avg(monthData.sun) / 3600), // seconds to hours
        });
      }
    }

    // Process AI response
    let aiData = null;
    if (aiRes.status === "fulfilled") {
      try {
        const cleaned = aiRes.value.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        aiData = JSON.parse(cleaned);
      } catch {
        // AI parse failed — non-critical
      }
    }

    return NextResponse.json({
      destination,
      climate: monthlyClimate,
      analysis: aiData,
    });
  } catch (err) {
    console.error("Best time error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch best time data" },
      { status: 500 }
    );
  }
}
