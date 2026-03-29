import Header from "@/components/Header";
import DestinationComparison from "@/components/DestinationComparison";
import { Scale } from "lucide-react";

export const metadata = {
  title: "Compare Destinations — Wanderlust",
  description: "Compare two travel destinations side by side with weather, cost, safety, and more.",
};

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-4">
            <Scale className="w-4 h-4" />
            Destination Comparison
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Compare two destinations
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            See weather, cost, safety, language, and more — side by side.
          </p>
        </div>

        <DestinationComparison />
      </div>
    </div>
  );
}
