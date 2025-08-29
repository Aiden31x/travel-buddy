"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import { Destination } from "./types";

interface Props {
  destinations: Destination[];
  selectedDestination: Destination | null;
  onDestinationSelect: (destination: Destination) => void;
  center?: [number, number];
  zoom?: number;
}

export interface LeafletMapRef {
  panTo: (lat: number, lng: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setView: (lat: number, lng: number, zoom?: number) => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}

const LeafletMap = forwardRef<LeafletMapRef, Props>(
  ({ destinations, selectedDestination, onDestinationSelect, center = [37.7749, -122.4194], zoom = 12 }, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const destinationsRef = useRef<Destination[]>([]);
    const centerRef = useRef<[number, number]>([37.7749, -122.4194]);

    const createCustomIcon = useCallback((type: string, isSelected: boolean = false) => {
      if (typeof window === 'undefined') return null;

      const colors = {
        // Destination colors
        destination: '#3b82f6',
        place: '#6b7280',

        // Attraction colors
        landmark: '#374151',
        attraction: '#8b5cf6',
        park: '#10b981',
        restaurant: '#f59e0b',
        hotel: '#ef4444',

        // Food & Drink colors
        restaurants: '#ef4444',
        cafes: '#8b5cf6',
        fast_food: '#f59e0b',
        pubs_bars: '#10b981',
        ice_cream: '#ec4899',

        // Shopping colors
        malls: '#3b82f6',
        supermarkets: '#10b981',
        convenience: '#f59e0b',
        souvenirs: '#ec4899',
        bakeries: '#92400e',
        markets: '#059669',

        // Transport colors
        train_stations: '#3b82f6',
        metro_subway: '#8b5cf6',
        bus_stops: '#f59e0b',
        airports: '#06b6d4',
        ferry: '#0891b2',
        car_rental: '#dc2626',
        bike_rental: '#16a34a',

        // Safety & Health colors
        hospitals: '#dc2626',
        clinics: '#f97316',
        pharmacies: '#22c55e',
        police: '#1d4ed8',
        atms: '#059669',
        banks: '#0369a1'
      };

      const emojis = {
        // Destination emojis
        destination: '📍',
        place: '📍',

        // Attraction emojis
        landmark: '🏛️',
        attraction: '⭐',
        park: '🌳',
        restaurant: '🍽️',
        hotel: '🏨',

        // Food & Drink emojis
        restaurants: '🍽️',
        cafes: '☕',
        fast_food: '🍟',
        pubs_bars: '🍺',
        ice_cream: '🍦',

        // Shopping emojis
        malls: '🏢',
        supermarkets: '🛒',
        convenience: '🏪',
        souvenirs: '🎁',
        bakeries: '🥖',
        markets: '🏪',

        // Transport emojis
        train_stations: '🚂',
        metro_subway: '🚇',
        bus_stops: '🚌',
        airports: '✈️',
        ferry: '⛴️',
        car_rental: '🚗',
        bike_rental: '🚲',

        // Safety & Health emojis
        hospitals: '🏥',
        clinics: '🏥',
        pharmacies: '💊',
        police: '👮',
        atms: '🏧',
        banks: '🏦'
      };

      const size = isSelected ? 50 : 40;
      const color = colors[type as keyof typeof colors] || '#6b7280';
      const icon = emojis[type as keyof typeof emojis] || '📍';

      return (window as any).L?.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background-color: ${color};
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            cursor: pointer;
            font-size: ${size * 0.4}px;
            transition: all 0.2s ease;
            ${isSelected ? 'transform: scale(1.1); z-index: 1000;' : ''}
          ">
            ${icon}
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
    }, []);

    const clearMarkers = useCallback(() => {
      markersRef.current.forEach(marker => {
        if (marker && marker.remove) {
          marker.remove();
        }
      });
      markersRef.current = [];
    }, []);

    const addMarkers = useCallback(async (L: any) => {
      clearMarkers();

      destinations.forEach((destination) => {
        const isSelected = selectedDestination?.id === destination.id;
        const icon = createCustomIcon(destination.type, isSelected);

        if (!icon) return;

        const marker = L.marker([destination.latitude, destination.longitude], { icon })
          .addTo(mapInstanceRef.current);

        // Add tooltip with place name
        marker.bindTooltip(destination.name, {
          permanent: false,
          direction: 'top',
          className: 'custom-tooltip'
        });

        marker.on('click', () => {
          onDestinationSelect(destination);
        });

        // Store destination reference for updates
        marker.destinationId = destination.id;
        markersRef.current.push(marker);
      });
    }, [destinations, selectedDestination, onDestinationSelect, createCustomIcon, clearMarkers]);

    // Initialize map
    useEffect(() => {
      if (typeof window === 'undefined' || !mapRef.current) return;

      const initializeMap = async () => {
        try {
          // Dynamically import Leaflet
          const L = (await import('leaflet')).default;

          // Add CSS if not already present
          if (!document.querySelector('link[href*="leaflet.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
            document.head.appendChild(link);
          }

          if (!mapInstanceRef.current && mapRef.current) {
            // Create map instance
            mapInstanceRef.current = L.map(mapRef.current, {
              zoomControl: false // We'll use custom controls
            }).setView(center, zoom);

            // Store initial center
            centerRef.current = center;

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(mapInstanceRef.current);

            // Add markers if destinations exist
            if (destinations.length > 0) {
              addMarkers(L);
            }
          }
        } catch (error) {
          console.error('Failed to initialize Leaflet map:', error);
        }
      };

      initializeMap();

      // Cleanup function
      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
        markersRef.current = [];
      };
    }, []); // Only run once on mount

    // Update center only when it actually changes
    useEffect(() => {
      if (mapInstanceRef.current && center) {
        const [lat, lng] = center;
        const [currentLat, currentLng] = centerRef.current;

        // Only update if center actually changed
        if (Math.abs(lat - currentLat) > 0.001 || Math.abs(lng - currentLng) > 0.001) {
          centerRef.current = center;
          mapInstanceRef.current.setView(center, zoom);
        }
      }
    }, [center, zoom]);

    // Update markers when destinations or selection changes
    useEffect(() => {
      if (mapInstanceRef.current && typeof window !== 'undefined') {
        // Only update if destinations actually changed
        const destinationsChanged = JSON.stringify(destinations) !== JSON.stringify(destinationsRef.current);

        if (destinationsChanged) {
          destinationsRef.current = [...destinations];

          const updateMarkers = async () => {
            try {
              const L = (await import('leaflet')).default;
              addMarkers(L);
            } catch (error) {
              console.error('Failed to update markers:', error);
            }
          };

          updateMarkers();
        }
      }
    }, [destinations, selectedDestination, addMarkers]);

    useImperativeHandle(ref, () => ({
      panTo: (lat: number, lng: number) => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([lat, lng]);
        }
      },
      zoomIn: () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.zoomIn();
        }
      },
      zoomOut: () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.zoomOut();
        }
      },
      setView: (lat: number, lng: number, zoom = 12) => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], zoom);
        }
      },
      flyTo: (lat: number, lng: number, zoom = 12) => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], zoom);
        }
      }
    }), []);

    return (
      <div
        ref={mapRef}
        className="w-full h-full z-0"
        style={{ minHeight: '100vh' }}
      />
    );
  }
);

LeafletMap.displayName = 'LeafletMap';

export default LeafletMap;