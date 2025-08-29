import React, { useState, useEffect, useCallback } from "react";
import { Search, Loader } from "lucide-react";
import { AutocompletePlace } from "./types";

interface Props {
  onSearchResults: (results: AutocompletePlace[]) => void;
  onLoading?: (loading: boolean) => void;
}

const SearchBar: React.FC<Props> = ({ onSearchResults, onLoading }) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState("");

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        onSearchResults([]);
        return;
      }

      // Don't search if it's the same query
      if (searchQuery.trim() === lastSearchQuery.trim()) {
        return;
      }

      setIsSearching(true);
      onLoading?.(true);
      setError(null);
      setLastSearchQuery(searchQuery.trim());

      try {
        const response = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(searchQuery)}`);

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        onSearchResults(data.predictions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        onSearchResults([]);
      } finally {
        setIsSearching(false);
        onLoading?.(false);
      }
    }, 500), // Increased debounce time to reduce API calls
    [onSearchResults, onLoading, lastSearchQuery]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      debouncedSearch(query);
    }
  };

  const handleClear = () => {
    setQuery("");
    setError(null);
    onSearchResults([]);
    setLastSearchQuery("");
  };

  return (
    <div className="absolute top-6 left-6 z-10">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Where would you like to go today?"
          className="w-80 pl-12 pr-12 py-3 bg-white rounded-xl shadow-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isSearching && (
          <Loader className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 animate-spin" />
        )}
        {query && !isSearching && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 w-5 h-5"
          >
            ×
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default SearchBar;
