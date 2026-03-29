import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/app/lib/gemini";

/**
 * POST /api/destination/compare
 * Compares two destinations using RestCountries + Open-Meteo + Gemini.
 */
export async function POST(request: NextRequest) {
  try {
    const { destinations } = await request.json();

    if (!Array.isArray(destinations) || destinations.length !== 2) {
      return NextResponse.json({ error: "Provide exactly 2 destination objects" }, { status: 400 });
    }

    const [dest1, dest2] = destinations as { name: string; lat: number; lon: number }[];

    // Fetch all data in parallel
    const [country1, country2, weather1, weather2, aiComparison] = await Promise.allSettled([
      fetchCountryData(dest1.name),
      fetchCountryData(dest2.name),
      fetchCurrentWeather(dest1.lat, dest1.lon),
      fetchCurrentWeather(dest2.lat, dest2.lon),
      callGemini(
        `Compare these two travel destinations: ${dest1.name} vs ${dest2.name}.

Return ONLY valid JSON:
{
  "comparison": [
    {
      "category": "Safety",
      "dest1Score": 1-5,
      "dest2Score": 1-5,
      "dest1Note": "brief note",
      "dest2Note": "brief note"
    }
  ],
  "dest1Highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "dest2Highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "verdict": "one sentence overall comparison"
}

Categories to compare: Safety, Food Scene, Nightlife, Walkability, Cost of Living, Cultural Richness, Public Transport.
Scores are 1 (poor) to 5 (excellent).`,
        "You are a travel comparison expert. Return only valid JSON.",
        0.4
      ),
    ]);

    const resolve = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
      result.status === "fulfilled" ? result.value : fallback;

    let aiData = null;
    if (aiComparison.status === "fulfilled") {
      try {
        const cleaned = aiComparison.value.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        aiData = JSON.parse(cleaned);
      } catch { /* non-critical */ }
    }

    return NextResponse.json({
      destinations: [
        {
          name: dest1.name,
          country: resolve(country1, null),
          weather: resolve(weather1, null),
        },
        {
          name: dest2.name,
          country: resolve(country2, null),
          weather: resolve(weather2, null),
        },
      ],
      analysis: aiData,
    });
  } catch (err) {
    console.error("Compare error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to compare destinations" },
      { status: 500 }
    );
  }
}

async function fetchCountryData(cityName: string) {
  // Try to resolve city to country via Nominatim first
  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&accept-language=en`,
    { headers: { "User-Agent": "TravelBuddy/1.0" } }
  );
  const geoData = await geoRes.json();
  const countryCode = geoData?.[0]?.address?.country_code?.toUpperCase();

  if (!countryCode) {
    // Fallback: search RestCountries by name
    const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(cityName)}?fields=name,currencies,languages,timezones,population`);
    if (!res.ok) return null;
    const data = await res.json();
    return data[0] || null;
  }

  const res = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}?fields=name,currencies,languages,timezones,population`);
  if (!res.ok) return null;
  return await res.json();
}

async function fetchCurrentWeather(lat: number, lon: number) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.daily) return null;

  const avgHigh = Math.round(
    data.daily.temperature_2m_max.reduce((s: number, v: number) => s + v, 0) / data.daily.temperature_2m_max.length
  );
  const avgLow = Math.round(
    data.daily.temperature_2m_min.reduce((s: number, v: number) => s + v, 0) / data.daily.temperature_2m_min.length
  );

  return { avgHigh, avgLow };
}
