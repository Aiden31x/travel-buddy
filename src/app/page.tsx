"use client";

import React, { useState, useRef, useCallback } from "react";
import Header from "@/components/Header";
import LeafletMap from "@/components/LeafletMap";
import SearchBar from "@/components/SearchBar";
import MapControls from "@/components/Mapcontrols";
import DestinationCard from "@/components/DestinationCard";
import DestinationList from "@/components/DestinationList";
import PlaceSelector from "@/components/PlaceSelector";
import TripForm from "@/components/TripForm";
import ItineraryView from "@/components/ItineraryView";
import { Destination, Place, Itinerary, AutocompletePlace, LeafletMapRef } from "@/components/types";

export default function Home() {
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [searchResults, setSearchResults] = useState<AutocompletePlace[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [currentStep, setCurrentStep] = useState<'search' | 'places' | 'trip' | 'itinerary'>('search');
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<LeafletMapRef>(null);

  // Memoize the destinations array to prevent unnecessary re-renders
  const mapDestinations = React.useMemo(() => {
    // Show both the selected destination AND all nearby places as map pins
    const allDestinations: Destination[] = [];

    // Add the selected destination if we have one
    if (selectedDestination) {
      allDestinations.push(selectedDestination);
    }

    // Add all nearby places as destinations for the map
    if (nearbyPlaces.length > 0) {
      const nearbyDestinations: Destination[] = nearbyPlaces.map(place => ({
        id: parseInt(place.id),
        name: place.name,
        type: place.type || 'place',
        description: place.name,
        weather: null,
        about: null,
        rating: 0,
        image: null,
        latitude: place.lat,
        longitude: place.lon
      }));

      allDestinations.push(...nearbyDestinations);
    }

    return allDestinations;
  }, [selectedDestination, nearbyPlaces]);

  const handleSearchResults = useCallback((results: AutocompletePlace[]) => {
    setSearchResults(results);
    setCurrentStep('search');
    setError(null);
  }, []);

  const handleDestinationSelect = useCallback(async (autocompletePlace: AutocompletePlace) => {
    const destination: Destination = {
      id: Date.now(),
      name: autocompletePlace.description.split(',')[0],
      type: "destination",
      description: `Selected destination: ${autocompletePlace.description}`,
      weather: null,
      about: null,
      rating: 0,
      image: null,
      latitude: parseFloat(autocompletePlace.lat),
      longitude: parseFloat(autocompletePlace.lon)
    };

    setSelectedDestination(destination);

    // Pan map to selected destination
    if (mapRef.current) {
      mapRef.current.flyTo(destination.latitude, destination.longitude, 12);
    }

    // Fetch nearby places
    setLoading(true);
    try {
      // Use the correct category IDs that exist in the backend
      const categories = ['tourist_attractions', 'restaurants', 'malls', 'pubs_bars'];
      const allPlaces: Place[] = [];

      for (const category of categories) {
        const response = await fetch(
          `/api/places/nearby?lat=${destination.latitude}&lon=${destination.longitude}&category=${category}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch ${category} places`);
        }

        const data = await response.json();
        if (data.places) {
          allPlaces.push(...data.places);
        }
      }

      setNearbyPlaces(allPlaces);
      setCurrentStep('places');

      // Auto-fit map to show all places
      if (mapRef.current && allPlaces.length > 0) {
        // Calculate bounds to include destination and all nearby places
        const bounds = [
          [destination.latitude, destination.longitude],
          ...allPlaces.map(place => [place.lat, place.lon])
        ];

        // Add a small buffer around the bounds
        const latBuffer = 0.01; // About 1km buffer
        const lonBuffer = 0.01;

        const minLat = Math.min(...bounds.map(([lat]) => lat)) - latBuffer;
        const maxLat = Math.max(...bounds.map(([lat]) => lat)) + latBuffer;
        const minLon = Math.min(...bounds.map(([, lon]) => lon)) - lonBuffer;
        const maxLon = Math.max(...bounds.map(([, lon]) => lon)) + lonBuffer;

        // Fly to the center of all places with appropriate zoom
        const centerLat = (minLat + maxLat) / 2;
        const centerLon = (minLon + maxLon) / 2;

        mapRef.current.flyTo(centerLat, centerLon, 13);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nearby places');
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePlacesSelected = useCallback((places: Place[]) => {
    setSelectedPlaces(places);
    setCurrentStep('trip');
  }, []);

  const handleTripPlanned = useCallback((tripItinerary: Itinerary) => {
    setItinerary(tripItinerary);
    setCurrentStep('itinerary');
  }, []);

  const handleBackToSearch = useCallback(() => {
    setCurrentStep('search');
    setSearchResults([]);
    setNearbyPlaces([]);
    setSelectedPlaces([]);
    setSelectedDestination(null);
    setItinerary(null);
    setError(null);
  }, []);

  const handlePanToLocation = useCallback((lat: number, lng: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo(lat, lng, 15);
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  }, []);

  const handleLocate = useCallback(() => {
    if (navigator.geolocation && mapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          mapRef.current!.flyTo(latitude, longitude, 15);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get your location. Please check your browser settings.');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="relative flex-1">
        {/* Map Container */}
        <div className="relative h-screen">
          <LeafletMap
            ref={mapRef}
            destinations={mapDestinations}
            selectedDestination={selectedDestination}
            onDestinationSelect={() => { }}
            center={selectedDestination ? [selectedDestination.latitude, selectedDestination.longitude] : [37.7749, -122.4194]}
            zoom={12}
          />

          {/* Search Bar - Always visible */}
          <SearchBar
            onSearchResults={handleSearchResults}
            onLoading={setLoading}
          />

          {/* Map Controls */}
          <MapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onLocate={handleLocate}
          />

          {/* Nearby Places Info Overlay */}
          {currentStep === 'places' && nearbyPlaces.length > 0 && (
            <div className="absolute top-20 left-6 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  {nearbyPlaces.length} places found nearby
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select the places you want to visit
              </p>
            </div>
          )}

          {/* Map Pins Info Overlay */}
          {mapDestinations.length > 1 && (
            <div className="absolute top-32 left-6 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {mapDestinations.length} pins on map
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedDestination ? '1 destination + ' : ''}{nearbyPlaces.length} nearby places
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="absolute top-20 left-6 right-6 z-20 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg">
              <div className="flex justify-between items-center">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
              <div className="bg-white rounded-lg p-6 shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="text-lg font-medium">Loading nearby places...</span>
                </div>
              </div>
            </div>
          )}

          {/* Step-based Component Rendering */}
          {currentStep === 'search' && searchResults.length > 0 && (
            <DestinationList
              places={searchResults}
              onDestinationSelect={handleDestinationSelect}
              onBack={handleBackToSearch}
            />
          )}

          {currentStep === 'places' && nearbyPlaces.length > 0 && (
            <PlaceSelector
              places={nearbyPlaces}
              selectedPlaces={selectedPlaces}
              onSelectionChange={setSelectedPlaces}
              onNext={handlePlacesSelected}
              onBack={handleBackToSearch}
            />
          )}

          {currentStep === 'trip' && selectedDestination && (
            <TripForm
              destination={selectedDestination}
              selectedPlaces={selectedPlaces}
              onTripPlanned={handleTripPlanned}
              onBack={() => setCurrentStep('places')}
            />
          )}

          {currentStep === 'itinerary' && itinerary && (
            <ItineraryView
              itinerary={itinerary}
              onBack={() => setCurrentStep('trip')}
              onPanToLocation={handlePanToLocation}
            />
          )}

          {/* Legacy Destination Card - Keep for backward compatibility */}
          {selectedDestination && currentStep === 'search' && (
            <DestinationCard
              destination={selectedDestination}
              onClose={() => setSelectedDestination(null)}
              onPanToLocation={handlePanToLocation}
            />
          )}
        </div>
      </div>
    </div>
  );
}