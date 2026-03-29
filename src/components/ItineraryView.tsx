import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Calendar, MapPin, Clock, ChevronDown, ChevronUp, Save, Check, Download, CalendarPlus, Route, Backpack, Globe2, BarChart3 } from "lucide-react";
import { Itinerary, ItineraryDay, Activity, Destination, Place } from "./types";
import { optimizeRoute, totalDistance, type Waypoint } from "@/app/lib/haversine";
import PackingListModal from "./PackingList";
import CulturalTipsPanel from "./CulturalTips";
import TripAnalyticsPanel from "./TripAnalytics";

interface Props {
  itinerary: Itinerary;
  destination?: Destination | null;
  selectedPlaces?: Place[];
  onBack: () => void;
  onPanToLocation: (lat: number, lng: number) => void;
}

const ItineraryView: React.FC<Props> = ({ itinerary, destination, selectedPlaces, onBack, onPanToLocation }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localItinerary, setLocalItinerary] = useState<ItineraryDay[]>(itinerary.itinerary);
  const [showPackingList, setShowPackingList] = useState(false);
  const [showCulturalTips, setShowCulturalTips] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const activityToWaypoint = (p: Activity): Waypoint => ({
    name: p.name,
    lat: parseFloat(p.lat),
    lon: parseFloat(p.lon),
  });

  const handleOptimizeDay = (dayNum: number) => {
    setLocalItinerary((prev) => {
      const updated = prev.map((day) => {
        if (day.day !== dayNum || day.places.length < 3) return day;
        const waypoints = day.places.map(activityToWaypoint);
        const before = totalDistance(waypoints);
        const optimized = optimizeRoute(waypoints);
        const after = totalDistance(optimized);

        const newPlaces = optimized.map((wp) => day.places.find((p) => p.name === wp.name)!);
        const saved = ((before - after) / before) * 100;
        toast.success(`Day ${dayNum}: ${before.toFixed(1)} km → ${after.toFixed(1)} km (${saved.toFixed(0)}% shorter)`);
        return { ...day, places: newPlaces };
      });
      return updated;
    });
  };

  const handleOptimizeAll = () => {
    let totalBefore = 0;
    let totalAfter = 0;
    setLocalItinerary((prev) =>
      prev.map((day) => {
        if (day.places.length < 3) return day;
        const waypoints = day.places.map(activityToWaypoint);
        const before = totalDistance(waypoints);
        const optimized = optimizeRoute(waypoints);
        const after = totalDistance(optimized);
        totalBefore += before;
        totalAfter += after;
        const newPlaces = optimized.map((wp) => day.places.find((p) => p.name === wp.name)!);
        return { ...day, places: newPlaces };
      })
    );
    if (totalBefore > 0) {
      const saved = ((totalBefore - totalAfter) / totalBefore) * 100;
      toast.success(`Optimized: ${totalBefore.toFixed(1)} km → ${totalAfter.toFixed(1)} km (${saved.toFixed(0)}% shorter)`);
    }
  };

  const handleSaveTrip = async () => {
    if (!session?.user || !destination) return;
    setSaving(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Trip to ${itinerary.destination}`,
          destination: itinerary.destination,
          destinationLat: destination.latitude,
          destinationLon: destination.longitude,
          days: itinerary.days,
          budget: itinerary.budget,
          itinerary,
          isPublic: false,
          places: selectedPlaces?.map((p) => ({
            name: p.name,
            lat: p.lat,
            lon: p.lon,
            type: p.type,
            category: p.category,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(true);
        toast.success("Trip saved!");
        setTimeout(() => router.push(`/trips/${data.trip.id}`), 1000);
      } else {
        toast.error("Failed to save trip");
      }
    } catch {
      toast.error("Failed to save trip");
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    toast.loading("Generating PDF...", { id: "pdf" });
    const { downloadPDF } = await import("@/app/lib/export");
    await downloadPDF(itinerary);
    toast.success("PDF downloaded!", { id: "pdf" });
  };

  const handleExportCalendar = async () => {
    const { downloadICS } = await import("@/app/lib/export");
    downloadICS(itinerary);
    toast.success("Calendar file downloaded!");
  };

  const toggleDayExpansion = (day: number) => {
    setExpandedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handlePlaceClick = (lat: string, lon: string) => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!isNaN(latNum) && !isNaN(lonNum)) {
      onPanToLocation(latNum, lonNum);
    }
  };

  return (
    <div className="absolute top-6 right-6 z-10 w-96 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-[40rem] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-green-500" />
          <span>Your Itinerary</span>
        </h3>
      </div>

      {/* Itinerary Content */}
      <div className="max-h-80 overflow-y-auto">
        {localItinerary.length > 0 ? (
          <div className="p-4 space-y-4">
            {localItinerary.map((day) => {
              const isExpanded = expandedDays.includes(day.day);
              return (
                <div
                  key={day.day}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleDayExpansion(day.day)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {day.day}
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          Day {day.day}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {day.places.length} place{day.places.length !== 1 ? 's' : ''}
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
                    <div className="p-4 space-y-3">
                      {day.places.length >= 3 && (
                        <button
                          onClick={() => handleOptimizeDay(day.day)}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        >
                          <Route className="w-3 h-3" />
                          Optimize walking order
                        </button>
                      )}
                      {day.places.length > 0 ? (
                        <div className="space-y-2">
                          {day.places.map((place, index) => (
                            <button
                              key={index}
                              onClick={() => handlePlaceClick(place.lat, place.lon)}
                              className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all text-left group"
                            >
                              <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                                  <MapPin className="w-3 h-3 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h6 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {place.name}
                                  </h6>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full capitalize">
                                      {place.time}
                                    </span>
                                    {place.type && (
                                      <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                                        {place.type}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-sm">No places planned for this day</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Itinerary Available
            </h4>
            <p className="text-sm">
              There was an issue generating your itinerary. Please try again.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPackingList && (
        <PackingListModal
          itinerary={{ ...itinerary, itinerary: localItinerary }}
          onClose={() => setShowPackingList(false)}
        />
      )}
      {showCulturalTips && destination && (
        <CulturalTipsPanel
          destination={destination.name}
          onClose={() => setShowCulturalTips(false)}
        />
      )}
      {showAnalytics && (
        <TripAnalyticsPanel
          itinerary={{ ...itinerary, itinerary: localItinerary }}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-3">
        {/* Feature buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleOptimizeAll}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <Route className="w-3 h-3" />
            Optimize
          </button>
          <button
            onClick={() => setShowPackingList(true)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
          >
            <Backpack className="w-3 h-3" />
            Packing
          </button>
          <button
            onClick={() => setShowCulturalTips(true)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          >
            <Globe2 className="w-3 h-3" />
            Tips
          </button>
          <button
            onClick={() => setShowAnalytics(true)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
          >
            <BarChart3 className="w-3 h-3" />
            Stats
          </button>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            onClick={handleExportCalendar}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Calendar
          </button>
        </div>

        {session?.user && destination && (
          <button
            onClick={handleSaveTrip}
            disabled={saving || saved}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              saved
                ? "bg-green-500 text-white"
                : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
            } disabled:opacity-60`}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved! Redirecting...
              </>
            ) : saving ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Trip
              </>
            )}
          </button>
        )}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {localItinerary.length} day{localItinerary.length !== 1 ? 's' : ''} planned
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setExpandedDays(localItinerary.map(d => d.day))}
              className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={() => setExpandedDays([])}
              className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryView;
