"use client";

import React, { useState } from "react";
import { Map, Mountain, Satellite } from "lucide-react";

export type MapLayer = "street" | "satellite" | "terrain";

interface Props {
  onLayerChange: (layer: MapLayer) => void;
}

const layers: { id: MapLayer; label: string; icon: React.ElementType }[] = [
  { id: "street", label: "Street", icon: Map },
  { id: "satellite", label: "Satellite", icon: Satellite },
  { id: "terrain", label: "Terrain", icon: Mountain },
];

export default function MapLayerToggle({ onLayerChange }: Props) {
  const [active, setActive] = useState<MapLayer>("street");

  const handleClick = (layer: MapLayer) => {
    setActive(layer);
    onLayerChange(layer);
  };

  return (
    <div className="flex bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {layers.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => handleClick(id)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            active === id
              ? "bg-blue-600 text-white"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
