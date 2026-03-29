"use client";

import React, { useState } from "react";
import { Flame } from "lucide-react";
import { Itinerary } from "./types";
import { LeafletMapRef } from "./LeafletMap";

interface Props {
  itinerary: Itinerary | null;
  mapRef: React.RefObject<LeafletMapRef | null>;
}

export default function HeatmapToggle({ itinerary, mapRef }: Props) {
  const [active, setActive] = useState(false);

  const toggle = () => {
    if (!mapRef.current || !itinerary) return;

    if (active) {
      mapRef.current.hideHeatmap();
      setActive(false);
    } else {
      const data: [number, number, number][] = [];
      itinerary.itinerary.forEach((day) => {
        day.places.forEach((place) => {
          const lat = parseFloat(place.lat);
          const lon = parseFloat(place.lon);
          if (!isNaN(lat) && !isNaN(lon)) {
            data.push([lat, lon, 1]);
          }
        });
      });
      if (data.length > 0) {
        mapRef.current.showHeatmap(data);
        setActive(true);
      }
    }
  };

  if (!itinerary) return null;

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium shadow-lg border transition-colors ${
        active
          ? "bg-orange-500 text-white border-orange-500"
          : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      <Flame className="w-3.5 h-3.5" />
      Heatmap
    </button>
  );
}
