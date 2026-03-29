"use client";

import React, { useState } from "react";
import { Sparkles, Loader, ArrowRight } from "lucide-react";

interface ParsedTrip {
  destination: string | null;
  days: number;
  budget: "low" | "moderate" | "luxury";
  interests: string[];
}

interface Props {
  onParsed: (result: ParsedTrip) => void;
}

const EXAMPLES = [
  "3-day foodie trip to Tokyo on a budget",
  "Romantic week in Paris with art and wine",
  "5-day adventure trip to Bali, moderate budget",
  "Weekend in Barcelona for nightlife and beaches",
];

export default function NaturalLanguageInput({ onParsed }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const text = query.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/parse-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to parse");
      }

      if (!data.destination) {
        setError("Could not detect a destination. Try including a city name.");
        return;
      }

      onParsed({
        destination: data.destination,
        days: data.days || 3,
        budget: data.budget || "moderate",
        interests: data.interests || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-16 left-6 z-20 w-full max-w-xl">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Describe your dream trip
          </h3>
        </div>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. 3-day foodie trip to Tokyo on a budget"
            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || loading}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-500">{error}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setQuery(ex)}
              className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
