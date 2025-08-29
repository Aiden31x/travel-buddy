import React, { useState } from "react";
import { ArrowLeft, Calendar, DollarSign, Sparkles, Loader } from "lucide-react";
import { Place, Destination, Itinerary, TripRequest } from "./types";

interface Props {
  destination: Destination;
  selectedPlaces: Place[];
  onTripPlanned: (itinerary: Itinerary) => void;
  onBack: () => void;
}

const TripForm: React.FC<Props> = ({ destination, selectedPlaces, onTripPlanned, onBack }) => {
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState<"low" | "moderate" | "luxury">("moderate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const budgetOptions = [
    { value: "low", label: "Budget", icon: "💰", description: "Affordable options" },
    { value: "moderate", label: "Moderate", icon: "💳", description: "Mid-range experiences" },
    { value: "luxury", label: "Luxury", icon: "💎", description: "Premium experiences" }
  ] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const tripRequest: TripRequest = {
      destination: {
        name: destination.name,
        lat: destination.latitude.toString(),
        lon: destination.longitude.toString()
      },
      places: selectedPlaces.map(place => ({
        name: place.name,
        lat: place.lat.toString(),
        lon: place.lon.toString(),
        type: place.type
      })),
      days: days,
      budget: budget
    };

    try {
      const response = await fetch('/api/trip/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tripRequest)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to plan trip: ${response.status} - ${errorData}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.success && data.itinerary) {
        onTripPlanned(data.itinerary);
      } else {
        throw new Error('Invalid response format from trip planning service');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to plan trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-6 right-6 z-10 w-96 bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <span>Plan Your Trip</span>
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Destination Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">{destination.name}</h4>
          <p className="text-sm text-gray-600 mb-2">
            {selectedPlaces.length} place{selectedPlaces.length !== 1 ? 's' : ''} selected:
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedPlaces.slice(0, 3).map((place, index) => (
              <span
                key={place.id}
                className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                {place.name}
              </span>
            ))}
            {selectedPlaces.length > 3 && (
              <span className="inline-block px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                +{selectedPlaces.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Days Selection */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4" />
            <span>Trip Duration</span>
          </label>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setDays(Math.max(1, days - 1))}
              disabled={loading || days <= 1}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-gray-600"
            >
              -
            </button>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{days}</div>
              <div className="text-xs text-gray-500">day{days !== 1 ? 's' : ''}</div>
            </div>
            <button
              type="button"
              onClick={() => setDays(Math.min(14, days + 1))}
              disabled={loading || days >= 14}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-gray-600"
            >
              +
            </button>
          </div>
          <div className="text-xs text-gray-500 text-center">
            Choose between 1-14 days
          </div>
        </div>

        {/* Budget Selection */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
            <DollarSign className="w-4 h-4" />
            <span>Budget Level</span>
          </label>
          <div className="space-y-2">
            {budgetOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${budget === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <input
                  type="radio"
                  value={option.value}
                  checked={budget === option.value}
                  onChange={(e) => setBudget(e.target.value as typeof budget)}
                  disabled={loading}
                  className="sr-only"
                />
                <div className="text-lg">{option.icon}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {option.description}
                  </div>
                </div>
                {budget === option.value && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || selectedPlaces.length === 0}
          className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${loading || selectedPlaces.length === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Creating Your Itinerary...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Itinerary</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default TripForm;