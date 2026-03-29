"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">!</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Something went wrong
        </h2>
        <p className="text-gray-500 mb-6">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors inline-block"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
