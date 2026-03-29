"use client";

import React, { useMemo } from "react";
import { X, BarChart3, MapPin, Clock, Route } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Itinerary } from "./types";
import { haversineDistance } from "@/app/lib/haversine";

interface Props {
  itinerary: Itinerary;
  onClose: () => void;
}

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6",
];

export default function TripAnalyticsPanel({ itinerary, onClose }: Props) {
  const stats = useMemo(() => {
    const allPlaces = itinerary.itinerary.flatMap((d) => d.places);
    const totalPlaces = allPlaces.length;

    // Category breakdown
    const catCounts: Record<string, number> = {};
    allPlaces.forEach((p) => {
      const cat = p.type || "other";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const categoryData = Object.entries(catCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Time distribution
    const timeCounts: Record<string, number> = { morning: 0, afternoon: 0, evening: 0 };
    allPlaces.forEach((p) => {
      if (p.time in timeCounts) timeCounts[p.time]++;
    });
    const timeData = Object.entries(timeCounts).map(([name, value]) => ({ name, value }));

    // Daily walking distance
    const dailyDistance = itinerary.itinerary.map((day) => {
      let dist = 0;
      for (let i = 1; i < day.places.length; i++) {
        const a = day.places[i - 1];
        const b = day.places[i];
        const lat1 = parseFloat(a.lat), lon1 = parseFloat(a.lon);
        const lat2 = parseFloat(b.lat), lon2 = parseFloat(b.lon);
        if (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2)) {
          dist += haversineDistance(lat1, lon1, lat2, lon2);
        }
      }
      return { name: `Day ${day.day}`, distance: parseFloat(dist.toFixed(1)) };
    });

    const totalDistance = dailyDistance.reduce((s, d) => s + d.distance, 0);
    const busiestDay = itinerary.itinerary.reduce(
      (max, day) => (day.places.length > max.places.length ? day : max),
      itinerary.itinerary[0]
    );

    return { totalPlaces, categoryData, timeData, dailyDistance, totalDistance, busiestDay };
  }, [itinerary]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Trip Analytics</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
              <MapPin className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalPlaces}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Total Places</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
              <Route className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalDistance.toFixed(1)}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Total km</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
              <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                Day {stats.busiestDay?.day}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Busiest Day</p>
            </div>
          </div>

          {/* Category breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Activity Breakdown
            </h4>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name || ""} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {stats.categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Walking distance per day */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Walking Distance per Day
            </h4>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.dailyDistance}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" km" width={50} />
                <Tooltip formatter={(v) => `${v} km`} />
                <Bar dataKey="distance" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Time distribution */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Time of Day Distribution
            </h4>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={stats.timeData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
