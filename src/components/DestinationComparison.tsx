"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader, ArrowRight, Shuffle, MapPin } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface ComparisonCategory {
  category: string;
  dest1Score: number;
  dest2Score: number;
  dest1Note: string;
  dest2Note: string;
}

interface CountryData {
  name?: { common?: string };
  currencies?: Record<string, { name: string; symbol?: string }>;
  languages?: Record<string, string>;
  timezones?: string[];
  population?: number;
}

interface ComparisonResult {
  destinations: {
    name: string;
    country: CountryData | null;
    weather: { avgHigh: number; avgLow: number } | null;
  }[];
  analysis: {
    comparison: ComparisonCategory[];
    dest1Highlights: string[];
    dest2Highlights: string[];
    verdict: string;
  } | null;
}

interface DestInput {
  name: string;
  lat: number;
  lon: number;
}

interface Suggestion {
  place_id: string;
  description: string;
  lat: string;
  lon: string;
  type: string;
}

const POPULAR_DESTINATIONS = [
  "Paris", "Tokyo", "New York", "London", "Rome", "Barcelona",
  "Bangkok", "Dubai", "Istanbul", "Sydney", "Rio de Janeiro",
  "Cape Town", "Seoul", "Amsterdam", "Prague", "Marrakech",
  "Buenos Aires", "Lisbon", "Singapore", "Mexico City",
];

function pickTwo(): [string, string] {
  const pool = [...POPULAR_DESTINATIONS];
  const i = Math.floor(Math.random() * pool.length);
  const first = pool.splice(i, 1)[0];
  const j = Math.floor(Math.random() * pool.length);
  return [first, pool[j]];
}

function AutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (dest: DestInput) => void;
  placeholder: string;
  onEnter: () => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setFetching(true);
    try {
      const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data.predictions || []);
      setOpen(true);
    } catch {
      setSuggestions([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(value), 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="flex-1 relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      {fetching && <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter") { setOpen(false); onEnter(); } }}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden z-50 max-h-60 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              onClick={() => {
                const name = s.description.split(",")[0];
                onChange(s.description);
                onSelect({ name, lat: parseFloat(s.lat), lon: parseFloat(s.lon) });
                setOpen(false);
                setSuggestions([]);
              }}
              className="w-full px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-start gap-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {s.description.split(",")[0]}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {s.description.split(",").slice(1).join(",").trim()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DestinationComparison() {
  const [dest1Query, setDest1Query] = useState("");
  const [dest2Query, setDest2Query] = useState("");
  const [dest1Resolved, setDest1Resolved] = useState<DestInput | null>(null);
  const [dest2Resolved, setDest2Resolved] = useState<DestInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const geocode = async (query: string): Promise<DestInput | null> => {
    const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.predictions?.length) return null;
    const p = data.predictions[0];
    return { name: p.description.split(",")[0], lat: parseFloat(p.lat), lon: parseFloat(p.lon) };
  };

  const handleCompare = async () => {
    if (!dest1Query.trim() || !dest2Query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const [d1, d2] = await Promise.all([
        dest1Resolved || geocode(dest1Query),
        dest2Resolved || geocode(dest2Query),
      ]);
      if (!d1 || !d2) {
        setError("Could not find one or both destinations. Try different names.");
        return;
      }

      const res = await fetch("/api/destination/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinations: [d1, d2] }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.analysis?.comparison.map((c) => ({
    category: c.category,
    [result.destinations[0].name]: c.dest1Score,
    [result.destinations[1].name]: c.dest2Score,
  }));

  const getCurrencyLabel = (country: CountryData | null) => {
    if (!country?.currencies) return "—";
    const codes = Object.keys(country.currencies);
    return codes.length ? `${country.currencies[codes[0]].name} (${codes[0]})` : "—";
  };

  const getLanguages = (country: CountryData | null) => {
    if (!country?.languages) return "—";
    return Object.values(country.languages).slice(0, 3).join(", ");
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Search inputs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <AutocompleteInput
          value={dest1Query}
          onChange={(v) => { setDest1Query(v); setDest1Resolved(null); }}
          onSelect={(d) => { setDest1Query(d.name); setDest1Resolved(d); }}
          placeholder="First destination..."
          onEnter={handleCompare}
        />
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleCompare}
            disabled={loading || !dest1Query.trim() || !dest2Query.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2 justify-center font-medium text-sm"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Compare
          </button>
          <button
            onClick={() => {
              const [a, b] = pickTwo();
              setDest1Query(a);
              setDest2Query(b);
              setDest1Resolved(null);
              setDest2Resolved(null);
            }}
            disabled={loading}
            className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors flex items-center gap-2 text-sm font-medium"
            title="Pick random destinations"
          >
            <Shuffle className="w-4 h-4" />
            Surprise Me
          </button>
        </div>
        <AutocompleteInput
          value={dest2Query}
          onChange={(v) => { setDest2Query(v); setDest2Resolved(null); }}
          onSelect={(d) => { setDest2Query(d.name); setDest2Resolved(d); }}
          placeholder="Second destination..."
          onEnter={handleCompare}
        />
      </div>

      {/* Quick-pick chips */}
      <div className="flex flex-wrap gap-1.5 mb-8 justify-center">
        {POPULAR_DESTINATIONS.slice(0, 12).map((dest) => (
          <button
            key={dest}
            onClick={() => {
              if (!dest1Query.trim()) { setDest1Query(dest); setDest1Resolved(null); }
              else if (!dest2Query.trim()) { setDest2Query(dest); setDest2Resolved(null); }
              else {
                setDest1Query(dest2Query);
                setDest1Resolved(dest2Resolved);
                setDest2Query(dest);
                setDest2Resolved(null);
              }
            }}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              dest1Query === dest || dest2Query === dest
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {dest}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-center text-red-500 text-sm mb-6">{error}</div>
      )}

      {result && (
        <div className="space-y-8">
          {/* Quick facts side by side */}
          <div className="grid grid-cols-2 gap-4">
            {result.destinations.map((dest, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{dest.name}</h3>
                <div className="space-y-2 text-sm">
                  {dest.weather && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Temp (7-day avg)</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {dest.weather.avgLow}° – {dest.weather.avgHigh}°C
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Currency</span>
                    <span className="font-medium text-gray-900 dark:text-white text-right text-xs">
                      {getCurrencyLabel(dest.country)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Languages</span>
                    <span className="font-medium text-gray-900 dark:text-white text-right text-xs">
                      {getLanguages(dest.country)}
                    </span>
                  </div>
                </div>

                {/* Highlights */}
                {result.analysis && (
                  <div className="mt-4 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Highlights</p>
                    {(i === 0 ? result.analysis.dest1Highlights : result.analysis.dest2Highlights).map((h, j) => (
                      <p key={j} className="text-xs text-gray-600 dark:text-gray-300 flex gap-1.5">
                        <span className="text-green-500">•</span> {h}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Score chart */}
          {chartData && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Head to Head</h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey={result.destinations[0].name} fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey={result.destinations[1].name} fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Verdict */}
          {result.analysis?.verdict && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 text-center">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {result.analysis.verdict}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
