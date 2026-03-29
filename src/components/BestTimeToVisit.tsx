"use client";

import React, { useState, useEffect } from "react";
import { Loader, CalendarDays } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface MonthClimate {
  month: string;
  avgHigh: number;
  avgLow: number;
  avgRainfall: number;
  avgSunshine: number;
}

interface MonthAnalysis {
  month: string;
  crowdLevel: "low" | "medium" | "high";
  priceLevel: "low" | "medium" | "high";
  verdict: string;
}

interface Props {
  destination: string;
  lat: number;
  lon: number;
}

const CROWD_COLORS = { low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
const PRICE_COLORS = CROWD_COLORS;

export default function BestTimeToVisit({ destination, lat, lon }: Props) {
  const [climate, setClimate] = useState<MonthClimate[]>([]);
  const [analysis, setAnalysis] = useState<{ months: MonthAnalysis[]; bestMonths: string[]; reasoning: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `/api/destination/best-time?destination=${encodeURIComponent(destination)}&lat=${lat}&lon=${lon}`
        );
        const data = await res.json();
        if (data.climate) setClimate(data.climate);
        if (data.analysis) setAnalysis(data.analysis);
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [destination, lat, lon]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
        <Loader className="w-3 h-3 animate-spin" /> Loading best time data...
      </div>
    );
  }

  if (!climate.length && !analysis) return null;

  const chartData = climate.map((c) => ({
    name: c.month.slice(0, 3),
    "High °C": c.avgHigh,
    "Low °C": c.avgLow,
    "Rain mm": c.avgRainfall,
  }));

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">Best Time to Visit</span>
          {analysis?.bestMonths && (
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
              {analysis.bestMonths.slice(0, 3).join(", ")}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Temperature chart */}
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={35} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="High °C" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Low °C" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Monthly crowd/price breakdown */}
          {analysis?.months && (
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              {analysis.months.map((m) => (
                <div key={m.month} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">{m.month.slice(0, 3)}</p>
                  <span className={`inline-block px-1.5 py-0.5 rounded mt-1 ${CROWD_COLORS[m.crowdLevel]}`}>
                    {m.crowdLevel}
                  </span>
                  <span className={`inline-block px-1.5 py-0.5 rounded mt-0.5 ${PRICE_COLORS[m.priceLevel]}`}>
                    ${m.priceLevel}
                  </span>
                </div>
              ))}
            </div>
          )}

          {analysis?.reasoning && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              {analysis.reasoning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
