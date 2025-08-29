import React, { useState } from "react";
import { Heart, Star, Send, MapPin } from "lucide-react";
import { Destination } from "./types";

interface Props {
  destination: Destination;
  onClose: () => void;
  onPanToLocation?: (lat: number, lng: number) => void; // New prop for map interaction
}

const DestinationCard: React.FC<Props> = ({ destination, onClose, onPanToLocation }) => {
  const [isFavorited, setIsFavorited] = useState(false);

  const handleViewOnMap = () => {
    if (onPanToLocation) {
      onPanToLocation(destination.latitude, destination.longitude);
    }
  };

  return (
    <div className="absolute top-6 right-6 w-80 bg-white rounded-2xl shadow-xl z-20 overflow-hidden">

      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-orange-400 to-red-500">
        {destination.image && destination.image.trim() !== '' ? (
          <img src={destination.image} alt={destination.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-4xl font-bold">{destination.name.charAt(0)}</div>
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-opacity-30 transition-all"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{destination.name}</h2>
          <button
            onClick={() => setIsFavorited(!isFavorited)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Heart className={`w-5 h-5 ${isFavorited ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </button>
        </div>

        <p className="text-gray-600 mb-6 leading-relaxed">{destination.description}</p>

        {/* Location Info */}
        <div className="mb-4">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <MapPin className="w-4 h-4 mr-1" />
            <span>Lat: {destination.latitude.toFixed(4)}, Lng: {destination.longitude.toFixed(4)}</span>
          </div>
          <button
            onClick={handleViewOnMap}
            className="text-blue-600 text-sm hover:text-blue-700 transition-colors"
          >
            Center on map
          </button>
        </div>

        {/* Weather */}
        {destination.weather && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Weather</h3>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-400 rounded-full"></div>
              <span className="text-gray-700">{destination.weather}</span>
            </div>
          </div>
        )}

        {/* About */}
        {destination.about && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{destination.about}</p>
          </div>
        )}

        {/* Rating */}
        {destination.rating && (
          <div className="flex items-center space-x-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.floor(destination.rating!) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
              />
            ))}
            <span className="text-sm text-gray-600 ml-2">({destination.rating}/5)</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <button className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors">
            Plan Trip
          </button>
          <button className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <Send className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DestinationCard;