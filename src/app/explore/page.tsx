"use client";

import React, { useState, useRef, useCallback } from "react";
import Header from "@/components/Header";
import LeafletMap from "@/components/LeafletMap";
import SearchBar from "@/components/SearchBar";
import MapControls from "@/components/Mapcontrols";
import AnimatedPanel from "@/components/AnimatedPanel";
import DestinationList from "@/components/DestinationList";
import PlaceSelector from "@/components/PlaceSelector";
import TripForm from "@/components/TripForm";
import ItineraryView from "@/components/ItineraryView";
import ChatWidget from "@/components/ChatWidget";
import MapLayerToggle from "@/components/MapLayerToggle";
import HeatmapToggle from "@/components/HeatmapToggle";
import NaturalLanguageInput from "@/components/NaturalLanguageInput";
import type { RouteData } from "@/components/LeafletMap";
import { Destination, Place, Itinerary, AutocompletePlace, LeafletMapRef } from "@/components/types";

export default function ExplorePage() {
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [searchResults, setSearchResults] = useState<AutocompletePlace[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [currentStep, setCurrentStep] = useState<'search' | 'places' | 'trip' | 'itinerary'>('search');
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walkingRoutes, setWalkingRoutes] = useState<RouteData[]>([]);
  const [searchMode, setSearchMode] = useState<'manual' | 'ai'>('manual');
  const mapRef = useRef<LeafletMapRef>(null);

  const mapDestinations = React.useMemo(() => {
    const allDestinations: Destination[] = [];

    if (selectedDestination) {
      allDestinations.push(selectedDestination);
    }

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

    if (mapRef.current) {
      mapRef.current.flyTo(destination.latitude, destination.longitude, 12);
    }

    setLoading(true);
    try {
      const categories = 'tourist_attractions,restaurants,malls,pubs_bars';
      const response = await fetch(
        `/api/places/nearby?lat=${destination.latitude}&lon=${destination.longitude}&categories=${categories}&limit=100`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch nearby places');
      }

      const data = await response.json();
      const allPlaces: Place[] = data.places || [];

      setNearbyPlaces(allPlaces);
      setCurrentStep('places');

      if (mapRef.current && allPlaces.length > 0) {
        const bounds = [
          [destination.latitude, destination.longitude],
          ...allPlaces.map(place => [place.lat, place.lon])
        ];

        const latBuffer = 0.01;
        const lonBuffer = 0.01;

        const minLat = Math.min(...bounds.map(([lat]) => lat)) - latBuffer;
        const maxLat = Math.max(...bounds.map(([lat]) => lat)) + latBuffer;
        const minLon = Math.min(...bounds.map(([, lon]) => lon)) - lonBuffer;
        const maxLon = Math.max(...bounds.map(([, lon]) => lon)) + lonBuffer;

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

  const handleTripPlanned = useCallback(async (tripItinerary: Itinerary) => {
    setItinerary(tripItinerary);
    setCurrentStep('itinerary');

    // Fetch walking routes for each day
    const routes: RouteData[] = [];
    for (const day of tripItinerary.itinerary) {
      if (day.places.length < 2) continue;
      const waypoints = day.places
        .map((p) => [parseFloat(p.lat), parseFloat(p.lon)] as [number, number])
        .filter(([lat, lon]) => !isNaN(lat) && !isNaN(lon));
      if (waypoints.length < 2) continue;
      try {
        const res = await fetch(
          `/api/route/walking?waypoints=${waypoints.map((w) => `${w[0]},${w[1]}`).join(";")}`
        );
        if (res.ok) {
          const data = await res.json();
          routes.push({ dayNumber: day.day, coordinates: data.coordinates, distance: data.distance });
        }
      } catch {
        // Non-critical — just skip the route
      }
    }
    setWalkingRoutes(routes);
  }, []);

  const handleBackToSearch = useCallback(() => {
    setCurrentStep('search');
    setSearchResults([]);
    setNearbyPlaces([]);
    setSelectedPlaces([]);
    setSelectedDestination(null);
    setItinerary(null);
    setWalkingRoutes([]);
    setError(null);
  }, []);

  const handlePanToLocation = useCallback((lat: number, lng: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo(lat, lng, 15);
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleLocate = useCallback(() => {
    if (navigator.geolocation && mapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          mapRef.current!.flyTo(latitude, longitude, 15);
        },
        () => {
          setError('Unable to get your location. Please check your browser settings.');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  }, []);

  const handleNLParsed = useCallback(async (result: { destination: string | null; days: number; budget: 'low' | 'moderate' | 'luxury'; interests: string[] }) => {
    if (!result.destination) return;

    // Geocode the destination via autocomplete
    setLoading(true);
    try {
      const geoRes = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(result.destination)}`);
      const geoData = await geoRes.json();
      if (!geoData.predictions?.length) {
        setError(`Could not find "${result.destination}" on the map`);
        return;
      }
      const place = geoData.predictions[0];
      // Trigger the normal flow from here
      await handleDestinationSelect(place);
      setSearchMode('manual');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to geocode destination');
    } finally {
      setLoading(false);
    }
  }, [handleDestinationSelect]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Header />

      <div className="relative flex-1 overflow-hidden">
          <LeafletMap
            ref={mapRef}
            destinations={mapDestinations}
            selectedDestination={selectedDestination}
            onDestinationSelect={() => { }}
            center={selectedDestination ? [selectedDestination.latitude, selectedDestination.longitude] : [37.7749, -122.4194]}
            zoom={12}
            routes={walkingRoutes}
          />

          {/* Search area: toggle + input */}
          {currentStep === 'search' && (
            <div className="absolute top-6 left-6 z-20">
              {/* Mode toggle pills */}
              {searchResults.length === 0 && (
                <div className="flex mb-2 bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden w-fit">
                  <button
                    onClick={() => setSearchMode('manual')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${searchMode === 'manual' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    Search
                  </button>
                  <button
                    onClick={() => setSearchMode('ai')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${searchMode === 'ai' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    AI Planning
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 'search' && (
            searchMode === 'manual' ? (
              <SearchBar
                onSearchResults={handleSearchResults}
                onLoading={setLoading}
              />
            ) : (
              <NaturalLanguageInput onParsed={handleNLParsed} />
            )
          )}

          {/* Bottom-left: map layer controls */}
          <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2">
            <MapLayerToggle onLayerChange={(layer) => mapRef.current?.setTileLayer(layer)} />
            <HeatmapToggle itinerary={itinerary} mapRef={mapRef} />
          </div>

          {/* Bottom-right: zoom/locate controls */}
          <MapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onLocate={handleLocate}
          />

          {/* Info overlay — guides user to the right panel */}
          <AnimatedPanel show={currentStep === 'places' && nearbyPlaces.length > 0} direction="left">
            <div className="absolute top-6 left-6 z-20 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {nearbyPlaces.length} places found nearby
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use the panel on the right to pick the places you want, then plan your trip &rarr;
              </p>
            </div>
          </AnimatedPanel>

          {/* Error Display */}
          <AnimatedPanel show={!!error} direction="up">
            <div className="absolute top-32 left-6 right-6 z-20 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg shadow-lg">
              <div className="flex justify-between items-center">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                >
                  x
                </button>
              </div>
            </div>
          </AnimatedPanel>

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-gray-700 border-t-blue-500" />
                  <span className="text-lg font-medium text-gray-900 dark:text-white">Discovering places...</span>
                </div>
              </div>
            </div>
          )}

          {/* Step panels with animations */}
          <AnimatedPanel show={currentStep === 'search' && searchResults.length > 0} direction="right">
            <DestinationList
              places={searchResults}
              onDestinationSelect={handleDestinationSelect}
              onBack={handleBackToSearch}
            />
          </AnimatedPanel>

          <AnimatedPanel show={currentStep === 'places' && nearbyPlaces.length > 0} direction="right">
            <PlaceSelector
              places={nearbyPlaces}
              selectedPlaces={selectedPlaces}
              onSelectionChange={setSelectedPlaces}
              onNext={handlePlacesSelected}
              onBack={handleBackToSearch}
            />
          </AnimatedPanel>

          <AnimatedPanel show={currentStep === 'trip' && !!selectedDestination} direction="right">
            {selectedDestination && (
              <TripForm
                destination={selectedDestination}
                selectedPlaces={selectedPlaces}
                onTripPlanned={handleTripPlanned}
                onBack={() => setCurrentStep('places')}
              />
            )}
          </AnimatedPanel>

          <AnimatedPanel show={currentStep === 'itinerary' && !!itinerary} direction="right">
            {itinerary && (
              <ItineraryView
                itinerary={itinerary}
                destination={selectedDestination}
                selectedPlaces={selectedPlaces}
                onBack={() => setCurrentStep('trip')}
                onPanToLocation={handlePanToLocation}
              />
            )}
          </AnimatedPanel>
      </div>

      <ChatWidget destination={selectedDestination} selectedPlaces={selectedPlaces} />
    </div>
  );
}
