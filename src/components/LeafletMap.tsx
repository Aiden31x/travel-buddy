"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import { Destination } from "./types";
import type { MapLayer } from "./MapLayerToggle";

export interface RouteData {
  dayNumber: number;
  coordinates: [number, number][];
  distance?: number;
}

interface Props {
  destinations: Destination[];
  selectedDestination: Destination | null;
  onDestinationSelect: (destination: Destination) => void;
  center?: [number, number];
  zoom?: number;
  routes?: RouteData[];
}

export interface LeafletMapRef {
  panTo: (lat: number, lng: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setView: (lat: number, lng: number, zoom?: number) => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  setTileLayer: (layer: MapLayer) => void;
  showHeatmap: (data: [number, number, number][]) => void;
  hideHeatmap: () => void;
}

const TILE_LAYERS: Record<MapLayer, { url: string; attribution: string }> = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenTopoMap",
  },
};

const DAY_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#a855f7",
  "#e11d48", "#22d3ee", "#84cc16", "#6366f1",
];

const LeafletMap = forwardRef<LeafletMapRef, Props>(
  ({ destinations, selectedDestination, onDestinationSelect, center = [37.7749, -122.4194], zoom = 12, routes }, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersRef = useRef<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clusterGroupRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tileLayerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routeLayersRef = useRef<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heatLayerRef = useRef<any>(null);
    const destinationsRef = useRef<Destination[]>([]);
    const centerRef = useRef<[number, number]>([37.7749, -122.4194]);

    const createCustomIcon = useCallback((type: string, isSelected: boolean = false) => {
      if (typeof window === "undefined") return null;

      const colors: Record<string, string> = {
        destination: "#3b82f6", place: "#6b7280",
        landmark: "#374151", attraction: "#8b5cf6", park: "#10b981",
        restaurant: "#f59e0b", hotel: "#ef4444",
        restaurants: "#ef4444", cafes: "#8b5cf6", fast_food: "#f59e0b",
        pubs_bars: "#10b981", ice_cream: "#ec4899",
        malls: "#3b82f6", supermarkets: "#10b981", convenience: "#f59e0b",
        souvenirs: "#ec4899", bakeries: "#92400e", markets: "#059669",
        train_stations: "#3b82f6", metro_subway: "#8b5cf6", bus_stops: "#f59e0b",
        airports: "#06b6d4", ferry: "#0891b2", car_rental: "#dc2626", bike_rental: "#16a34a",
        hospitals: "#dc2626", clinics: "#f97316", pharmacies: "#22c55e",
        police: "#1d4ed8", atms: "#059669", banks: "#0369a1",
      };

      const emojis: Record<string, string> = {
        destination: "📍", place: "📍",
        landmark: "🏛️", attraction: "⭐", park: "🌳",
        restaurant: "🍽️", hotel: "🏨",
        restaurants: "🍽️", cafes: "☕", fast_food: "🍟",
        pubs_bars: "🍺", ice_cream: "🍦",
        malls: "🏢", supermarkets: "🛒", convenience: "🏪",
        souvenirs: "🎁", bakeries: "🥖", markets: "🏪",
        train_stations: "🚂", metro_subway: "🚇", bus_stops: "🚌",
        airports: "✈️", ferry: "⛴️", car_rental: "🚗", bike_rental: "🚲",
        hospitals: "🏥", clinics: "🏥", pharmacies: "💊",
        police: "👮", atms: "🏧", banks: "🏦",
      };

      const size = isSelected ? 50 : 40;
      const color = colors[type] || "#6b7280";
      const icon = emojis[type] || "📍";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).L?.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="
            width: ${size}px; height: ${size}px;
            background-color: ${color}; border: 3px solid white; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3); cursor: pointer;
            font-size: ${size * 0.4}px; transition: all 0.2s ease;
            ${isSelected ? "transform: scale(1.1); z-index: 1000;" : ""}
          ">${icon}</div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    }, []);

    const clearMarkers = useCallback(() => {
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers();
      }
      markersRef.current.forEach((m) => m?.remove?.());
      markersRef.current = [];
    }, []);

    const addMarkers = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (L: any) => {
        clearMarkers();

        // Dynamically load markercluster
        if (!clusterGroupRef.current && mapInstanceRef.current) {
          try {
            await import("leaflet.markercluster");
            if (!document.querySelector('link[href*="MarkerCluster"]')) {
              const link = document.createElement("link");
              link.rel = "stylesheet";
              link.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
              document.head.appendChild(link);
              const link2 = document.createElement("link");
              link2.rel = "stylesheet";
              link2.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
              document.head.appendChild(link2);
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clusterGroupRef.current = (L as any).markerClusterGroup({
              maxClusterRadius: 50,
              spiderfyOnMaxZoom: true,
              showCoverageOnHover: false,
            });
            mapInstanceRef.current.addLayer(clusterGroupRef.current);
          } catch {
            // Fallback: no clustering
            clusterGroupRef.current = null;
          }
        }

        destinations.forEach((destination) => {
          const isSelected = selectedDestination?.id === destination.id;
          const icon = createCustomIcon(destination.type, isSelected);
          if (!icon) return;

          const marker = L.marker([destination.latitude, destination.longitude], { icon });

          marker.bindTooltip(destination.name, {
            permanent: false,
            direction: "top",
            className: "custom-tooltip",
          });

          marker.on("click", () => onDestinationSelect(destination));
          marker.destinationId = destination.id;

          if (clusterGroupRef.current) {
            clusterGroupRef.current.addLayer(marker);
          } else {
            marker.addTo(mapInstanceRef.current);
          }

          markersRef.current.push(marker);
        });
      },
      [destinations, selectedDestination, onDestinationSelect, createCustomIcon, clearMarkers]
    );

    const clearRoutes = useCallback(() => {
      routeLayersRef.current.forEach((layer) => layer?.remove?.());
      routeLayersRef.current = [];
    }, []);

    const drawRoutes = useCallback(async (routeData: RouteData[]) => {
      clearRoutes();
      if (!mapInstanceRef.current || !routeData.length) return;

      const L = (await import("leaflet")).default;

      routeData.forEach((route) => {
        const color = DAY_COLORS[(route.dayNumber - 1) % DAY_COLORS.length];
        const polyline = L.polyline(route.coordinates, {
          color,
          weight: 4,
          opacity: 0.8,
          dashArray: "8 6",
        }).addTo(mapInstanceRef.current);

        if (route.distance) {
          const mid = route.coordinates[Math.floor(route.coordinates.length / 2)];
          if (mid) {
            const km = (route.distance / 1000).toFixed(1);
            const label = L.tooltip({ permanent: true, direction: "center", className: "route-label" })
              .setLatLng(mid)
              .setContent(`<span style="font-size:10px;font-weight:600;color:${color}">Day ${route.dayNumber}: ${km} km</span>`);
            label.addTo(mapInstanceRef.current);
            routeLayersRef.current.push(label);
          }
        }

        routeLayersRef.current.push(polyline);
      });
    }, [clearRoutes]);

    // Draw routes when prop changes
    useEffect(() => {
      if (routes && routes.length > 0) {
        drawRoutes(routes);
      } else {
        clearRoutes();
      }
    }, [routes, drawRoutes, clearRoutes]);

    // Initialize map
    useEffect(() => {
      if (typeof window === "undefined" || !mapRef.current) return;

      const initializeMap = async () => {
        try {
          const L = (await import("leaflet")).default;

          if (!document.querySelector('link[href*="leaflet.css"]')) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
            document.head.appendChild(link);
          }

          if (!mapInstanceRef.current && mapRef.current) {
            mapInstanceRef.current = L.map(mapRef.current, {
              zoomControl: false,
            }).setView(center, zoom);

            centerRef.current = center;

            tileLayerRef.current = L.tileLayer(TILE_LAYERS.street.url, {
              attribution: TILE_LAYERS.street.attribution,
              maxZoom: 19,
            }).addTo(mapInstanceRef.current);

            if (destinations.length > 0) {
              addMarkers(L);
            }
          }
        } catch (error) {
          console.error("Failed to initialize Leaflet map:", error);
        }
      };

      initializeMap();

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
        markersRef.current = [];
        clusterGroupRef.current = null;
        tileLayerRef.current = null;
        routeLayersRef.current = [];
        heatLayerRef.current = null;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Update center
    useEffect(() => {
      if (mapInstanceRef.current && center) {
        const [lat, lng] = center;
        const [currentLat, currentLng] = centerRef.current;
        if (Math.abs(lat - currentLat) > 0.001 || Math.abs(lng - currentLng) > 0.001) {
          centerRef.current = center;
          mapInstanceRef.current.setView(center, zoom);
        }
      }
    }, [center, zoom]);

    // Update markers
    useEffect(() => {
      if (mapInstanceRef.current && typeof window !== "undefined") {
        const changed = JSON.stringify(destinations) !== JSON.stringify(destinationsRef.current);
        if (changed) {
          destinationsRef.current = [...destinations];
          const update = async () => {
            try {
              const L = (await import("leaflet")).default;
              addMarkers(L);
            } catch (error) {
              console.error("Failed to update markers:", error);
            }
          };
          update();
        }
      }
    }, [destinations, selectedDestination, addMarkers]);

    useImperativeHandle(
      ref,
      () => ({
        panTo: (lat: number, lng: number) => {
          mapInstanceRef.current?.panTo([lat, lng]);
        },
        zoomIn: () => {
          mapInstanceRef.current?.zoomIn();
        },
        zoomOut: () => {
          mapInstanceRef.current?.zoomOut();
        },
        setView: (lat: number, lng: number, z = 12) => {
          mapInstanceRef.current?.setView([lat, lng], z);
        },
        flyTo: (lat: number, lng: number, z = 12) => {
          mapInstanceRef.current?.flyTo([lat, lng], z);
        },
        setTileLayer: async (layer: MapLayer) => {
          if (!mapInstanceRef.current) return;
          const L = (await import("leaflet")).default;
          if (tileLayerRef.current) {
            mapInstanceRef.current.removeLayer(tileLayerRef.current);
          }
          const config = TILE_LAYERS[layer];
          tileLayerRef.current = L.tileLayer(config.url, {
            attribution: config.attribution,
            maxZoom: 19,
          }).addTo(mapInstanceRef.current);
        },
        showHeatmap: async (data: [number, number, number][]) => {
          if (!mapInstanceRef.current || !data.length) return;
          // Load leaflet-heat from CDN
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (!(window as any).L?.heatLayer) {
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement("script");
              script.src = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
              script.onload = () => resolve();
              script.onerror = () => reject(new Error("Failed to load leaflet-heat"));
              document.head.appendChild(script);
            });
          }
          if (heatLayerRef.current) {
            mapInstanceRef.current.removeLayer(heatLayerRef.current);
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          heatLayerRef.current = (window as any).L.heatLayer(data, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            gradient: { 0.2: "blue", 0.4: "lime", 0.6: "yellow", 0.8: "orange", 1: "red" },
          }).addTo(mapInstanceRef.current);
        },
        hideHeatmap: () => {
          if (heatLayerRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(heatLayerRef.current);
            heatLayerRef.current = null;
          }
        },
      }),
      []
    );

    return (
      <div
        ref={mapRef}
        className="w-full h-full z-0"
        style={{ minHeight: "100vh" }}
      />
    );
  }
);

LeafletMap.displayName = "LeafletMap";

export default LeafletMap;
