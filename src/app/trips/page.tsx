"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Header from "@/components/Header";
import { MapPin, Calendar, Clock, Plus, Trash2, Globe } from "lucide-react";

interface Trip {
  id: string;
  title: string;
  destination: string;
  destinationLat: number;
  destinationLon: number;
  days: number;
  budget: string;
  isPublic: boolean;
  createdAt: string;
}

export default function TripsPage() {
  const { data: session, status } = useSession();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/trips")
        .then((res) => res.json())
        .then((data) => setTrips(data.trips || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this trip?")) return;
    await fetch(`/api/trips/${id}`, { method: "DELETE" });
    setTrips((prev) => prev.filter((t) => t.id !== id));
  };

  const handleTogglePublic = async (id: string, isPublic: boolean) => {
    await fetch(`/api/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !isPublic }),
    });
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isPublic: !t.isPublic } : t))
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
            <p className="text-gray-500 mt-1">Your saved itineraries</p>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Trip
          </Link>
        </div>

        {status === "unauthenticated" && (
          <div className="text-center py-20">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Sign in to save trips
            </h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Create an account to save your AI-generated itineraries and access
              them anywhere.
            </p>
            <Link
              href="/api/auth/signin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}

        {status === "authenticated" && loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        )}

        {status === "authenticated" && !loading && trips.length === 0 && (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No trips yet
            </h2>
            <p className="text-gray-500 mb-6">
              Start exploring to create your first AI-powered itinerary.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Explore Destinations
            </Link>
          </div>
        )}

        {trips.length > 0 && (
          <div className="grid gap-4">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <Link href={`/trips/${trip.id}`} className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate">
                      {trip.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {trip.destination}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {trip.days} day{trip.days !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(trip.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full capitalize">
                        {trip.budget}
                      </span>
                      {trip.isPublic && (
                        <span className="px-2.5 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Public
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleTogglePublic(trip.id, trip.isPublic)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={trip.isPublic ? "Make private" : "Make public"}
                    >
                      <Globe className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(trip.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete trip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
