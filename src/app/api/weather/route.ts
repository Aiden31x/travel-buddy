import { NextRequest, NextResponse } from "next/server";

interface WeatherDay {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  description: string;
  icon: string;
}

const weatherCodeMap: Record<number, { description: string; icon: string }> = {
  0: { description: "Clear sky", icon: "sun" },
  1: { description: "Mainly clear", icon: "sun" },
  2: { description: "Partly cloudy", icon: "cloud-sun" },
  3: { description: "Overcast", icon: "cloud" },
  45: { description: "Foggy", icon: "cloud-fog" },
  48: { description: "Depositing rime fog", icon: "cloud-fog" },
  51: { description: "Light drizzle", icon: "cloud-drizzle" },
  53: { description: "Moderate drizzle", icon: "cloud-drizzle" },
  55: { description: "Dense drizzle", icon: "cloud-drizzle" },
  61: { description: "Slight rain", icon: "cloud-rain" },
  63: { description: "Moderate rain", icon: "cloud-rain" },
  65: { description: "Heavy rain", icon: "cloud-rain" },
  71: { description: "Slight snow", icon: "snowflake" },
  73: { description: "Moderate snow", icon: "snowflake" },
  75: { description: "Heavy snow", icon: "snowflake" },
  80: { description: "Slight showers", icon: "cloud-rain" },
  81: { description: "Moderate showers", icon: "cloud-rain" },
  82: { description: "Violent showers", icon: "cloud-rain" },
  95: { description: "Thunderstorm", icon: "cloud-lightning" },
  96: { description: "Thunderstorm with hail", icon: "cloud-lightning" },
  99: { description: "Thunderstorm with heavy hail", icon: "cloud-lightning" },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const days = searchParams.get("days") || "7";

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  try {
    const forecastDays = Math.min(parseInt(days), 16);
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=${forecastDays}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      throw new Error("Weather API request failed");
    }

    const data = await res.json();
    const forecast: WeatherDay[] = data.daily.time.map((date: string, i: number) => {
      const code = data.daily.weathercode[i];
      const info = weatherCodeMap[code] || { description: "Unknown", icon: "cloud" };
      return {
        date,
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        weatherCode: code,
        description: info.description,
        icon: info.icon,
      };
    });

    return NextResponse.json({ forecast });
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}
