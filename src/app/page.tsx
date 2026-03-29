import Link from "next/link";
import { MapPin, Sparkles, Globe, Calendar } from "lucide-react";
import Header from "@/components/Header";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-emerald-950/20" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Trip Planning
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
              Plan your dream trip in&nbsp;minutes
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-xl">
              Search any destination, pick the places you love, and let AI craft a
              personalized day-by-day itinerary — complete with an interactive map.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/explore"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                <MapPin className="w-5 h-5" />
                Start Exploring
              </Link>
              <Link
                href="/trips"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <Calendar className="w-5 h-5" />
                My Trips
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-4">
          How it works
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-14 max-w-lg mx-auto">
          Three simple steps from idea to a fully planned trip
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Globe,
              title: "Search a Destination",
              description:
                "Type any city or place — our geocoder finds it instantly and drops you on an interactive map.",
              color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
            },
            {
              icon: MapPin,
              title: "Pick Your Places",
              description:
                "Browse nearby attractions, restaurants, and landmarks. Select the ones you want in your trip.",
              color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
            },
            {
              icon: Sparkles,
              title: "Generate Itinerary",
              description:
                "AI builds a day-by-day schedule optimized for distance, timing, and your budget.",
              color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
            },
          ].map((step, i) => (
            <div
              key={i}
              className="relative p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="absolute -top-4 -left-2 w-8 h-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${step.color}`}>
                <step.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {step.title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-900 dark:bg-gray-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to plan your next adventure?</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            No sign-up required to explore. Create an account to save and share your trips.
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
          >
            <MapPin className="w-5 h-5" />
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
