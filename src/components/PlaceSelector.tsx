import React, { useState } from "react";
import { ArrowLeft, ArrowRight, MapPin, Check } from "lucide-react";
import { Place } from "./types";

interface Props {
  places: Place[];
  selectedPlaces: Place[];
  onSelectionChange: (places: Place[]) => void;
  onNext: (places: Place[]) => void;
  onBack: () => void;
}

const PlaceSelector: React.FC<Props> = ({
  places,
  selectedPlaces,
  onSelectionChange,
  onNext,
  onBack
}) => {
  const [filter, setFilter] = useState<string | null>(null);

  // Use the correct category IDs that exist in the backend
  const categories = [
    { id: 'tourist_attractions', label: 'Attractions', icon: '🏛️' },
    { id: 'restaurants', label: 'Restaurants', icon: '🍽️' },
    { id: 'malls', label: 'Shopping', icon: '🛍️' },
    { id: 'pubs_bars', label: 'Nightlife', icon: '🍸' }
  ];

  const filteredPlaces = filter
    ? places.filter(place => place.category === filter)
    : places;

  const isSelected = (place: Place) => {
    return selectedPlaces.some(selected =>
      selected.id === place.id
    );
  };

  const togglePlaceSelection = (place: Place) => {
    if (isSelected(place)) {
      // Remove from selection
      const updated = selectedPlaces.filter(selected => selected.id !== place.id);
      onSelectionChange(updated);
    } else {
      // Add to selection
      onSelectionChange([...selectedPlaces, place]);
    }
  };

  const handleNext = () => {
    if (selectedPlaces.length > 0) {
      onNext(selectedPlaces);
    }
  };

  if (places.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-6 right-6 z-10 w-96 bg-white rounded-xl shadow-lg border border-gray-200 max-h-[32rem] overflow-hidden">
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
          Select Places
        </h3>
      </div>

      {/* Category Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${filter === null
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            All ({places.length})
          </button>
          {categories.map(category => {
            const count = places.filter(p => p.category === category.id).length;
            return (
              <button
                key={category.id}
                onClick={() => setFilter(category.id)}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors ${filter === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {category.icon} {category.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Places List */}
      <div className="max-h-64 overflow-y-auto">
        {filteredPlaces.length > 0 ? (
          filteredPlaces.map((place) => {
            const selected = isSelected(place);
            return (
              <button
                key={place.id}
                onClick={() => togglePlaceSelection(place)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors ${selected ? 'bg-blue-50 border-blue-200' : ''
                  }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${selected ? 'bg-blue-500' : 'bg-gray-100'
                    }`}>
                    {selected ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <MapPin className={`w-5 h-5 ${selected ? 'text-white' : 'text-gray-600'}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`text-sm font-medium truncate ${selected ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                      {place.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {place.lat}, {place.lon}
                    </p>
                    {place.category && (
                      <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full capitalize ${selected
                        ? 'bg-blue-200 text-blue-800'
                        : 'bg-gray-200 text-gray-700'
                        }`}>
                        {place.category.replace('_', ' ')}
                      </span>
                    )}
                    {place.type && (
                      <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${selected
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                        }`}>
                        {place.type}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-8 text-center text-gray-500">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm">No places found in this category</p>
          </div>
        )}
      </div>

      {/* Footer with Selection Count and Next Button */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {selectedPlaces.length} place{selectedPlaces.length !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={handleNext}
            disabled={selectedPlaces.length === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPlaces.length > 0
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
          >
            <span>Plan Trip</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaceSelector;