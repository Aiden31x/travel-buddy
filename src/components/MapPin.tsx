import React from "react";
import { Place } from "./types";

interface Props {
  place: Place;
  onClick: (place: Place) => void;
  isActive: boolean;
}

const MapPin: React.FC<Props> = ({ place, onClick, isActive }) => {
  const getPinIcon = (type: string) => {
    if (type.includes('attraction') || type.includes('tourism')) return "★";
    if (type.includes('landmark') || type.includes('historic')) return "🏛️";
    if (type.includes('food') || type.includes('restaurant')) return "🍽️";
    if (type.includes('shop') || type.includes('mall')) return "🛍️";
    if (type.includes('nightlife') || type.includes('bar')) return "🍸";
    return "📍";
  };

  const getPinColor = (type: string) => {
    if (type.includes('attraction') || type.includes('tourism')) return "bg-purple-500";
    if (type.includes('landmark') || type.includes('historic')) return "bg-gray-700";
    if (type.includes('food') || type.includes('restaurant')) return "bg-orange-500";
    if (type.includes('shop') || type.includes('mall')) return "bg-blue-500";
    if (type.includes('nightlife') || type.includes('bar')) return "bg-pink-500";
    return "bg-green-500";
  };

  return (
    <button
      onClick={() => onClick(place)}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 hover:scale-110 ${isActive ? "scale-110" : ""
        }`}
      style={{ left: place.lat, top: place.lon }}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${getPinColor(place.type)}`}
      >
        <span className="text-white text-lg">{getPinIcon(place.type)}</span>
      </div>
    </button>
  );
};

export default MapPin;
