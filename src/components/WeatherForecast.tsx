"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  Snowflake,
  CloudSun,
  Thermometer,
} from "lucide-react";

interface WeatherDay {
  date: string;
  tempMax: number;
  tempMin: number;
  description: string;
  icon: string;
}

const iconMap: Record<string, React.ElementType> = {
  sun: Sun,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  "cloud-rain": CloudRain,
  "cloud-drizzle": CloudDrizzle,
  "cloud-lightning": CloudLightning,
  "cloud-fog": CloudFog,
  snowflake: Snowflake,
};

interface Props {
  lat: number;
  lon: number;
  days: number;
}

export default function WeatherForecast({ lat, lon, days }: Props) {
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/weather?lat=${lat}&lon=${lon}&days=${days}`)
      .then((r) => r.json())
      .then((d) => setForecast(d.forecast || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lat, lon, days]);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: Math.min(days, 7) }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-20 h-24 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (forecast.length === 0) return null;

  const displayDays = forecast.slice(0, days);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {displayDays.map((day, i) => {
        const Icon = iconMap[day.icon] || Thermometer;
        const date = new Date(day.date + "T00:00:00");
        const dayLabel = i === 0 ? "Today" : date.toLocaleDateString("en", { weekday: "short" });

        return (
          <div
            key={day.date}
            className="flex-shrink-0 w-20 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-center"
          >
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
              {dayLabel}
            </p>
            <Icon className="w-5 h-5 mx-auto text-blue-500 dark:text-blue-400 mb-1" />
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {day.tempMax}°
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {day.tempMin}°
            </p>
          </div>
        );
      })}
    </div>
  );
}
