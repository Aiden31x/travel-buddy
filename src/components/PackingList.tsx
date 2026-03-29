"use client";

import React, { useState, useEffect } from "react";
import { X, Loader, Check, Backpack } from "lucide-react";
import { Itinerary, Destination } from "./types";

interface PackingItem {
  item: string;
  essential: boolean;
}

interface PackingCategory {
  name: string;
  items: PackingItem[];
}

interface Props {
  itinerary: Itinerary;
  destination?: Destination | null;
  onClose: () => void;
}

export default function PackingListModal({ itinerary, onClose }: Props) {
  const [categories, setCategories] = useState<PackingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const storageKey = `packing-${itinerary.destination}-${itinerary.days}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setChecked(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, [storageKey]);

  useEffect(() => {
    if (Object.keys(checked).length) {
      localStorage.setItem(storageKey, JSON.stringify(checked));
    }
  }, [checked, storageKey]);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const activities = itinerary.itinerary.flatMap((d) =>
          d.places.map((p) => p.type || p.name)
        );

        const res = await fetch("/api/ai/packing-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: itinerary.destination,
            days: itinerary.days,
            budget: itinerary.budget,
            activities: [...new Set(activities)],
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCategories(data.categories || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load packing list");
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [itinerary]);

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const total = categories.reduce((sum, c) => sum + c.items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Backpack className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Packing List</h3>
            {total > 0 && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                {checkedCount}/{total}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 animate-spin text-amber-500" />
              <span className="ml-2 text-sm text-gray-500">Generating your packing list...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-500 text-sm">{error}</div>
          )}

          {!loading && !error && categories.map((cat) => (
            <div key={cat.name}>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {cat.name}
              </h4>
              <div className="space-y-1">
                {cat.items.map((item) => {
                  const key = `${cat.name}-${item.item}`;
                  const isChecked = checked[key];
                  return (
                    <button
                      key={key}
                      onClick={() => toggle(key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                        isChecked
                          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 line-through"
                          : "bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        isChecked
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}>
                        {isChecked && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span>{item.item}</span>
                      {item.essential && !isChecked && (
                        <span className="ml-auto text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                          essential
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
