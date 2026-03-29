"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Header from "@/components/Header";
import LeafletMap from "@/components/LeafletMap";
import WeatherForecast from "@/components/WeatherForecast";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  Share2,
  Globe,
  Download,
  CalendarPlus,
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
  const mapRef = useRef<LeafletMapRef>(null);

  useEffect(() => {
    fetch(`/api/trips/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Trip not found" : "Failed to load trip");
        return res.json();
      })
      .then((data) => {
        setTrip(data.trip);
        document.title = `${data.trip.title} — Wanderlust`;
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePanToLocation = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo(lat, lng, 15);
  }, []);

  const handleShare = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const handleExportPDF = async () => {
    if (!trip) return;
    toast.loading("Generating PDF...", { id: "pdf" });
    const { downloadPDF } = await import("@/app/lib/export");
    await downloadPDF(trip.itinerary);
    toast.success("PDF downloaded!", { id: "pdf" });
  };

  const handleExportCalendar = async () => {
    if (!trip) return;
    const { downloadICS } = await import("@/app/lib/export");
    downloadICS(trip.itinerary);
    toast.success("Calendar file downloaded!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded skeleton-pulse mb-6" />
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded skeleton-pulse mb-2" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded skeleton-pulse mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 h-[500px] rounded-xl bg-gray-200 dark:bg-gray-800 skeleton-pulse" />
            <div className="lg:col-span-2 h-[500px] rounded-xl bg-gray-200 dark:bg-gray-800 skeleton-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <div className="text-center py-32">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/trips"
            className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{trip.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {trip.destination}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {trip.days} day{trip.days !== 1 ? "s" : ""}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full capitalize">
                {trip.budget}
              </span>
              {trip.isPublic && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Globe className="w-3.5 h-3.5" />
                  Public
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Export as PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={handleExportCalendar}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Add to Calendar"
            >
              <CalendarPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        {/* Weather Forecast */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Weather Forecast</h3>
          <WeatherForecast lat={trip.destinationLat} lon={trip.destinationLon} days={trip.days} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 h-[500px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <LeafletMap
              ref={mapRef}
              destinations={mapDestinations}
              selectedDestination={dest}
              onDestinationSelect={() => {}}
              center={[trip.destinationLat, trip.destinationLon]}
              zoom={12}
            />
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 max-h-[500px] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-500" />
                Itinerary
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {trip.itinerary.itinerary.map((day) => {
                const isExpanded = expandedDays.includes(day.day);
                return (
                  <div key={day.day} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() =>
                        setExpandedDays((prev) =>
                          prev.includes(day.day) ? prev.filter((d) => d !== day.day) : [...prev, day.day]
                        )
                      }
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {day.day}
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Day {day.day}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
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
                            className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all text-left group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <MapPin className="w-3 h-3 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h6 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {place.name}
                                </h6>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full capitalize flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {place.time}
                                  </span>
                                  {place.type && (
                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
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
