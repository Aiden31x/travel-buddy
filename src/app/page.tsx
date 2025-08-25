'use client'; // Client-side component for interactivity

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet'; // For custom markers if needed

// Fix for Leaflet marker icons in Next.js
import 'leaflet/dist/leaflet.css';

// Define types for API responses (based on your backend)
interface Prediction {
  place_id: string;
  description: string;
  lat: string;
  lon: string;
  type: string;
}

interface PlaceDetails {
  place_id: string;
  name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    city?: string;
    country?: string;
    postcode?: string;
  };
  opening_hours?: string;
  website?: string;
}

interface NearbyPlace {
  id: string;
  name: string;
  lat: string;
  lon: string;
  type: string;
  category: string;
}

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons for different marker types
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

export default function Home() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Prediction | null>(null);
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [nearby, setNearby] = useState<NearbyPlace[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]); // Default center

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (query.length > 2) { // Debounce: only fetch after 3 chars
      fetch(`/api/places/autocomplete?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => setSuggestions(data.predictions || []))
        .catch(err => console.error('Autocomplete error:', err));
    } else {
      setSuggestions([]);
    }
  }, [query]);

  // Handle selecting a suggestion
  const handleSelect = async (place: Prediction) => {
    setSelectedPlace(place);
    setQuery(place.description);
    setSuggestions([]);

    // Fetch details
    const detailsRes = await fetch(`/api/places/details?place_id=${place.place_id}`);
    const detailsData = await detailsRes.json();
    setDetails(detailsData.details);

    // Fetch nearby
    const nearbyRes = await fetch(`/api/places/nearby?lat=${place.lat}&lon=${place.lon}&radius=5000&type=tourist_attraction`);
    const nearbyData = await nearbyRes.json();
    setNearby(nearbyData.places);

    // Update map center
    setMapCenter([parseFloat(place.lat), parseFloat(place.lon)]);
  };

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Travel Buddy</h1>
      
      {/* Search Input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a destination (e.g., Paris)"
        className="w-full p-2 border border-gray-300 rounded mb-2"
      />
      
      {/* Suggestions Dropdown */}
      {suggestions.length > 0 && (
        <ul className="border border-gray-300 rounded bg-white max-h-40 overflow-y-auto">
          {suggestions.map((sugg) => (
            <li
              key={sugg.place_id}
              onClick={() => handleSelect(sugg)}
              className="p-2 cursor-pointer hover:bg-gray-100"
            >
              {sugg.description}
            </li>
          ))}
        </ul>
      )}
      
      {/* Selected Place Details */}
      {details && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">{details.name}</h2>
          <p>Lat: {details.lat}, Lon: {details.lon}</p>
          {details.address && (
            <p>
              Address: {details.address.road}, {details.address.city}, {details.address.country} {details.address.postcode}
            </p>
          )}
          {details.opening_hours && <p>Opening Hours: {details.opening_hours}</p>}
          {details.website && <p>Website: <a href={details.website} target="_blank" rel="noopener noreferrer">{details.website}</a></p>}
        </div>
      )}
      
      {/* Nearby Attractions List */}
      {nearby.length > 0 && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Nearby Attractions</h2>
          <ul className="list-disc pl-5">
            {nearby.map((place) => (
              <li key={place.id}>
                {place.name} ({place.type}) - Lat: {place.lat}, Lon: {place.lon}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Map */}
      {selectedPlace && (
        <div className="mt-4 h-96">
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {/* Marker for selected place */}
            <Marker position={mapCenter} icon={selectedPlaceIcon}>
              <Popup>{selectedPlace.description}</Popup>
            </Marker>
            {/* Markers for nearby places */}
            {nearby.map((place) => (
              <Marker 
                key={place.id} 
                position={[parseFloat(place.lat), parseFloat(place.lon)]}
                icon={nearbyPlaceIcon}
              >
                <Popup>{place.name} ({place.category})</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </main>
  );
}