'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Type definitions based on your new Foursquare backend
interface AutocompleteSuggestion {
  id: string;
  display_text: string;
  category: string;
  address: string;
  coordinates: {
    lat: number | null;
    lng: number | null;
  };
  suggestion_type: string;
  match_confidence: string;
}

interface AutocompleteResponse {
  success: boolean;
  suggestions: AutocompleteSuggestion[];
  summary: {
    total_suggestions: number;
    categories_found: string[];
  };
}

interface PlaceDetails {
  id: string;
  name: string;
  lat: string;
  lon: string;
  categories: Array<{
    id: number;
    name: string;
    plural_name: string;
    short_name: string;
    icon: {
      prefix: string;
      suffix: string;
    };
  }>;
  rating?: number;
  price?: number;
  address: {
    formatted_address?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  hours?: any;
  website?: string;
  tel?: string;
  email?: string;
  description?: string;
  photos?: Array<{
    id: string;
    prefix: string;
    suffix: string;
    width: number;
    height: number;
  }>;
  attributes?: any;
}

interface SearchResult {
  id: string;
  name: string;
  category: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
}

interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  summary: {
    total_places_found: number;
    categories_found: string[];
  };
}

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons
const createCustomIcon = (color: string) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-marker',
    iconSize: [25, 25],
    iconAnchor: [12, 12],
  });
};

const selectedPlaceIcon = createCustomIcon('#ef4444'); // Red
const nearbyPlaceIcon = createCustomIcon('#3b82f6'); // Blue

// RecenterMap component
function RecenterMap({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();

  useEffect(() => {
    if (lat && lon) {
      map.setView([lat, lon], 14, { animate: true });
    }
  }, [lat, lon, map]);

  return null;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<AutocompleteSuggestion | null>(null);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<SearchResult[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch autocomplete suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length > 2) {
        try {
          setLoading(true);
          setError(null);
          
          const response = await fetch(`/api/foursquare/autocomplete?query=${encodeURIComponent(query)}&limit=8`);
          const data: AutocompleteResponse = await response.json();
          
          if (data.success) {
            setSuggestions(data.suggestions || []);
          } else {
            setError('Failed to fetch suggestions');
            setSuggestions([]);
          }
        } catch (err) {
          console.error('Autocomplete error:', err);
          setError('Failed to fetch suggestions');
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle selecting a suggestion
  const handleSelectPlace = async (place: AutocompleteSuggestion) => {
    if (!place.coordinates.lat || !place.coordinates.lng) {
      setError('Invalid coordinates for selected place');
      return;
    }

    setSelectedPlace(place);
    setQuery(place.display_text);
    setSuggestions([]);
    setLoading(true);
    setError(null);

    try {
      // Update map center immediately
      const newCenter: [number, number] = [place.coordinates.lat, place.coordinates.lng];
      setMapCenter(newCenter);

      // Fetch detailed information about the selected place
      const detailsResponse = await fetch(`/api/foursquare/details?fsq_place_id=${place.id}`);
      const detailsData = await detailsResponse.json();
      
      if (detailsData.details) {
        setPlaceDetails(detailsData.details);
      }

      // Fetch nearby places
      const nearbyResponse = await fetch(
        `/api/foursquare/search?lat=${place.coordinates.lat}&lng=${place.coordinates.lng}&radius=2000&limit=15`
      );
      const nearbyData: SearchResponse = await nearbyResponse.json();
      
      if (nearbyData.success) {
        // Filter out the selected place from nearby results
        const filteredNearby = nearbyData.results.filter(result => result.id !== place.id);
        setNearbyPlaces(filteredNearby);
      }

    } catch (err) {
      console.error('Error fetching place data:', err);
      setError('Failed to fetch place information');
    } finally {
      setLoading(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setSelectedPlace(null);
    setPlaceDetails(null);
    setNearbyPlaces([]);
    setError(null);
  };

  // Format rating display
  const formatRating = (rating?: number) => {
    if (!rating) return 'No rating';
    return `★ ${rating.toFixed(1)}/10`;
  };

  // Format price display
  const formatPrice = (price?: number) => {
    if (!price) return 'Price not available';
    return '$'.repeat(price) + ' '.repeat(4 - price);
  };

  return (
    <main className="p-4 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Travel Buddy</h1>
        <p className="text-gray-600">Discover amazing places powered by Foursquare</p>
      </div>
      
      {/* Search Input */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for places (e.g., restaurants in New York, Tokyo attractions...)"
          className="w-full p-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
        {loading && (
          <div className="absolute right-10 top-3 text-gray-400">
            Loading...
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Suggestions Dropdown */}
      {suggestions.length > 0 && (
        <div className="border border-gray-300 rounded-lg bg-white shadow-lg mb-4 max-h-64 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              onClick={() => handleSelectPlace(suggestion)}
              className="p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{suggestion.display_text}</div>
              <div className="text-sm text-gray-600">{suggestion.category}</div>
              <div className="text-xs text-gray-500">{suggestion.address}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      {selectedPlace && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Place Details */}
          <div className="space-y-6">
            {/* Selected Place Details */}
            {placeDetails && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-2">{placeDetails.name}</h2>
                
                {/* Categories */}
                {placeDetails.categories.length > 0 && (
                  <div className="mb-3">
                    {placeDetails.categories.map((category, index) => (
                      <span
                        key={category.id}
                        className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2 mb-1"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Rating and Price */}
                <div className="flex gap-4 mb-4">
                  <div className="text-sm">
                    <span className="font-medium">Rating:</span> {formatRating(placeDetails.rating)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Price:</span> {formatPrice(placeDetails.price)}
                  </div>
                </div>

                {/* Address */}
                {placeDetails.address.formatted_address && (
                  <div className="mb-4">
                    <span className="font-medium">Address:</span>
                    <p className="text-gray-700">{placeDetails.address.formatted_address}</p>
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-2">
                  {placeDetails.website && (
                    <div>
                      <span className="font-medium">Website:</span>{' '}
                      <a
                        href={placeDetails.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {placeDetails.website}
                      </a>
                    </div>
                  )}
                  {placeDetails.tel && (
                    <div>
                      <span className="font-medium">Phone:</span> {placeDetails.tel}
                    </div>
                  )}
                </div>

                {/* Description */}
                {placeDetails.description && (
                  <div className="mt-4">
                    <span className="font-medium">Description:</span>
                    <p className="text-gray-700 mt-1">{placeDetails.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* Nearby Places */}
            {nearbyPlaces.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold mb-4">
                  Nearby Places ({nearbyPlaces.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {nearbyPlaces.map((place) => (
                    <div key={place.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                      <div className="font-medium text-gray-900">{place.name}</div>
                      <div className="text-sm text-blue-600">{place.category}</div>
                      <div className="text-xs text-gray-500">{place.address}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {place.coordinates.lat.toFixed(4)}, {place.coordinates.lng.toFixed(4)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Map */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="h-96 lg:h-full min-h-96">
              <MapContainer 
                center={mapCenter} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <RecenterMap lat={mapCenter[0]} lon={mapCenter[1]} />
                
                {/* Selected place marker */}
                {selectedPlace && selectedPlace.coordinates.lat && selectedPlace.coordinates.lng && (
                  <Marker 
                    position={[selectedPlace.coordinates.lat, selectedPlace.coordinates.lng]} 
                    icon={selectedPlaceIcon}
                  >
                    <Popup>
                      <div>
                        <strong>{selectedPlace.display_text}</strong><br />
                        <span className="text-sm text-gray-600">{selectedPlace.category}</span>
                      </div>
                    </Popup>
                  </Marker>
                )}
                
                {/* Nearby places markers */}
                {nearbyPlaces.map((place) => (
                  <Marker 
                    key={place.id}
                    position={[place.coordinates.lat, place.coordinates.lng]}
                    icon={nearbyPlaceIcon}
                  >
                    <Popup>
                      <div>
                        <strong>{place.name}</strong><br />
                        <span className="text-sm text-gray-600">{place.category}</span><br />
                        <span className="text-xs text-gray-500">{place.address}</span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedPlace && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Start exploring</h3>
          <p className="text-gray-500">Search for places to discover amazing locations and nearby attractions</p>
        </div>
      )}
    </main>
  );
}