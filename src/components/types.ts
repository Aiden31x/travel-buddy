// Core API types matching backend responses
export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  category?: string;
  subcategory?: string;
  address?: string;
}

export interface AutocompletePlace {
  place_id: string;
  description: string;
  lat: string;
  lon: string;
  type: string;
}

export interface Activity {
  name: string;
  lat: string;
  lon: string;
  time: 'morning' | 'afternoon' | 'evening';
  type?: string;
}

export interface ItineraryDay {
  day: number;
  places: Activity[];
}

export interface Itinerary {
  destination: string;
  days: number;
  budget: string;
  itinerary: ItineraryDay[];
}

// Frontend-specific types for backward compatibility
export interface Destination {
  id: number;
  name: string;
  type: string;
  description: string;
  weather: string | null;
  about: string | null;
  rating: number;
  image: string | null;
  latitude: number;
  longitude: number;
}

// Trip planning types
export interface TripRequest {
  destination: {
    name: string;
    lat: string;
    lon: string;
  };
  places: {
    name: string;
    lat: string;
    lon: string;
    type?: string;
  }[];
  days: number;
  budget: 'low' | 'moderate' | 'luxury';
}

// Component prop types - re-export from LeafletMap
export interface LeafletMapRef {
  panTo: (lat: number, lng: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setView: (lat: number, lng: number, zoom?: number) => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}