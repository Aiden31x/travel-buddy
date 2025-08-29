import React, { useState } from "react";
import { ArrowLeft, Calendar, MapPin, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Itinerary } from "./types";

interface Props {
  itinerary: Itinerary;
  onBack: () => void;
  onPanToLocation: (lat: number, lng: number) => void;
}

const ItineraryView: React.FC<Props> = ({ itinerary, onBack, onPanToLocation }) => {
  const [expandedDays, setExpandedDays] = useState<number[]>([1]); // First day expanded by default

  const toggleDayExpansion = (day: number) => {
    setExpandedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handlePlaceClick = (lat: string, lon: string) => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!isNaN(latNum) && !isNaN(lonNum)) {
      onPanToLocation(latNum, lonNum);
    }
  };

  return (
    <div className="absolute top-6 right-6 z-10 w-96 bg-white rounded-xl shadow-lg border border-gray-200 max-h-[40rem] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-green-500" />
          <span>Your Itinerary</span>
        </h3>
      </div>

      {/* Itinerary Content */}
      <div className="max-h-96 overflow-y-auto">
        {itinerary.itinerary.length > 0 ? (
          <div className="p-4 space-y-4">
            {itinerary.itinerary.map((day) => {
              const isExpanded = expandedDays.includes(day.day);
              return (
                <div
                  key={day.day}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Day Header */}
                  <button
                    onClick={() => toggleDayExpansion(day.day)}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {day.day}
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Day {day.day}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {day.places.length} place{day.places.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* Day Content */}
                  {isExpanded && (
                    <div className="p-4 space-y-3">
                      {/* Places */}
                      {day.places.length > 0 ? (
                        <div className="space-y-2">
                          <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                            Places to Visit
                          </h5>
                          {day.places.map((place, index) => (
                            <button
                              key={index}
                              onClick={() => handlePlaceClick(place.lat, place.lon)}
                              className="w-full p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-left group"
                            >
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-green-200 transition-colors">
                                  <MapPin className="w-3 h-3 text-green-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h6 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {place.name}
                                  </h6>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-gray-500">
                                      📍 {parseFloat(place.lat).toFixed(4)}, {parseFloat(place.lon).toFixed(4)}
                                    </span>
                                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full capitalize">
                                      {place.time}
                                    </span>
                                  </div>
                                  {place.type && (
                                    <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                      {place.type}
                                    </span>
                                  )}
                                  <p className="text-xs text-blue-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Click to view on map
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm">No places planned for this day</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No Itinerary Available
            </h4>
            <p className="text-sm text-gray-500">
              There was an issue generating your itinerary. Please try again.
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {itinerary.itinerary.length} day{itinerary.itinerary.length !== 1 ? 's' : ''} planned
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setExpandedDays(itinerary.itinerary.map(d => d.day))}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedDays([])}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryView;