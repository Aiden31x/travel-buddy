import React from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { AutocompletePlace } from "./types";

interface Props {
  places: AutocompletePlace[];
  onDestinationSelect: (place: AutocompletePlace) => void;
  onBack: () => void;
}

const DestinationList: React.FC<Props> = ({ places, onDestinationSelect, onBack }) => {
  if (places.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-6 right-6 z-10 w-80 bg-white rounded-xl shadow-lg border border-gray-200 max-h-96 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          Select Destination
        </h3>
      </div>

      {/* Places List */}
      <div className="max-h-80 overflow-y-auto">
        {places.map((place, index) => (
          <button
            key={`${place.place_id}-${index}`}
            onClick={() => onDestinationSelect(place)}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
          >
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {place.description.split(',')[0]}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {place.description.split(',').slice(1).join(',').trim()}
                </p>
                <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
                  {place.type}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Choose a destination to explore nearby places
        </p>
      </div>
    </div>
  );
};

export default DestinationList;