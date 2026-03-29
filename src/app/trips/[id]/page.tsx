"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import LeafletMap from "@/components/LeafletMap";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Share2,
  Globe,
} from "lucide-react";
import { Destination, Itinerary, LeafletMapRef } from "@/components/types";

interface TripData {
  id: string;
  title: string;
  destination: string;
  destinationLat: number;
  destinationLon: number;
  days: number;
  budget: string;
  itinerary: Itinerary;
  isPublic: boolean;
  createdAt: string;
  user: { name: string | null; image: string | null };
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  const [copied, setCopied] = useState(false);
  const mapRef = useRef<LeafletMapRef>(null);

  useEffect(() => {
    fetch(`/api/trips/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Trip not found" : "Failed to load trip");
        return res.json();
      })
      .then((data) => setTrip(data.trip))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePanToLocation = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo(lat, lng, 15);
  }, []);

  const handleShare = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="text-center py-32">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || "Trip not found"}
          </h2>
          <Link href="/trips" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to My Trips
          </Link>
        </div>
      </div>
    );
  }

  const mapDestinations: Destination[] = [];
  const dest: Destination = {
    id: 0,
    name: trip.destination,
    type: "destination",
    description: trip.destination,
    weather: null,
    about: null,
    rating: 0,
    image: null,
    latitude: trip.destinationLat,
    longitude: trip.destinationLon,
  };
  mapDestinations.push(dest);

  trip.itinerary.itinerary.forEach((day) => {
    day.places.forEach((place, i) => {
      const lat = parseFloat(place.lat);
      const lon = parseFloat(place.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        mapDestinations.push({
          id: day.day * 100 + i,
          name: place.name,
          type: place.type || "place",
          description: place.name,
          weather: null,
          about: null,
          rating: 0,
          image: null,
          latitude: lat,
          longitude: lon,
        });
      }
    });
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/trips"
            className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{trip.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {trip.destination}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {trip.days} day{trip.days !== 1 ? "s" : ""}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full capitalize">
                {trip.budget}
              </span>
              {trip.isPublic && (
                <span className="flex items-center gap-1 text-green-600">
                  <Globe className="w-3.5 h-3.5" />
                  Public
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {copied ? "Copied!" : "Share"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 h-[500px] rounded-xl overflow-hidden border border-gray-200">
            <LeafletMap
              ref={mapRef}
              destinations={mapDestinations}
              selectedDestination={dest}
              onDestinationSelect={() => {}}
              center={[trip.destinationLat, trip.destinationLon]}
              zoom={12}
            />
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 max-h-[500px] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-500" />
                Itinerary
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {trip.itinerary.itinerary.map((day) => {
                const isExpanded = expandedDays.includes(day.day);
                return (
                  <div key={day.day} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() =>
                        setExpandedDays((prev) =>
                          prev.includes(day.day) ? prev.filter((d) => d !== day.day) : [...prev, day.day]
                        )
                      }
                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {day.day}
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-semibold text-gray-900">Day {day.day}</h4>
                          <p className="text-xs text-gray-500">
                            {day.places.length} place{day.places.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="p-3 space-y-2">
                        {day.places.map((place, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              const lat = parseFloat(place.lat);
                              const lon = parseFloat(place.lon);
                              if (!isNaN(lat) && !isNaN(lon)) handlePanToLocation(lat, lon);
                            }}
                            className="w-full p-3 bg-white border border-gray-100 rounded-lg hover:border-blue-300 transition-all text-left group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <MapPin className="w-3 h-3 text-green-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h6 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {place.name}
                                </h6>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full capitalize flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {place.time}
                                  </span>
                                  {place.type && (
                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                      {place.type}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
