"use client";

import React, { useState, useEffect } from "react";
import { X, Loader, Globe2, Shield, Coins, Languages } from "lucide-react";

interface Phrase {
  local: string;
  english: string;
  pronunciation: string;
}

interface MoneyInfo {
  currency: string;
  currencyName: string;
  tipping: string;
  avgMealCost: string;
  haggling: string;
}

interface TipsData {
  etiquette: string[];
  phrases: Phrase[];
  safety: string[];
  money: MoneyInfo;
}

interface Props {
  destination: string;
  onClose: () => void;
}

const tabs = [
  { id: "etiquette", label: "Etiquette", icon: Globe2 },
  { id: "phrases", label: "Phrases", icon: Languages },
  { id: "safety", label: "Safety", icon: Shield },
  { id: "money", label: "Money", icon: Coins },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function CulturalTipsPanel({ destination, onClose }: Props) {
  const [data, setData] = useState<TipsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("etiquette");

  useEffect(() => {
    const fetchTips = async () => {
      try {
        const res = await fetch("/api/ai/cultural-tips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destination }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load cultural tips");
      } finally {
        setLoading(false);
      }
    };
    fetchTips();
  }, [destination]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Local Tips — {destination}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                activeTab === id
                  ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="ml-2 text-sm text-gray-500">Loading cultural tips...</span>
            </div>
          )}

          {error && <div className="text-center py-8 text-red-500 text-sm">{error}</div>}

          {!loading && !error && data && (
            <>
              {activeTab === "etiquette" && (
                <ul className="space-y-2">
                  {data.etiquette.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-emerald-500 flex-shrink-0 mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              )}

              {activeTab === "phrases" && (
                <div className="space-y-3">
                  {data.phrases.map((p, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{p.local}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        &ldquo;{p.english}&rdquo; — <span className="italic">{p.pronunciation}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "safety" && (
                <ul className="space-y-2">
                  {data.safety.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              )}

              {activeTab === "money" && (
                <div className="space-y-3">
                  {[
                    { label: "Currency", value: `${data.money.currencyName} (${data.money.currency})` },
                    { label: "Tipping", value: data.money.tipping },
                    { label: "Avg Meal", value: data.money.avgMealCost },
                    { label: "Haggling", value: data.money.haggling },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-start gap-4">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase flex-shrink-0">
                        {label}
                      </span>
                      <span className="text-sm text-gray-800 dark:text-gray-200 text-right">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
