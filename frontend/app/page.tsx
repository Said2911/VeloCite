"use client";

import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import { searchListings, type Listing, type SearchParams } from "@/lib/api";

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (params: SearchParams) => {
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const result = await searchListings(params);
      setListings(result.listings);
      setTotal(result.total);
    } catch (err) {
      setError("Search failed. Make sure the backend is running.");
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">
            Find Property Anywhere in the World
          </h1>
          <p className="text-blue-200 text-lg mb-10">
            AI-powered value scoring · Real-time currency conversion · Market insights
          </p>
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Stats bar */}
        {searched && !loading && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-gray-600">
              {total > 0
                ? `Found ${total} listings`
                : "No listings found — try different filters"}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-3 w-3/4" />
                <div className="h-4 bg-gray-200 rounded mb-3 w-1/2" />
                <div className="h-8 bg-gray-200 rounded mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Listings Grid */}
        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && searched && listings.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No listings found
            </h3>
            <p className="text-gray-500">Try adjusting your search filters</p>
          </div>
        )}

        {/* Initial state */}
        {!searched && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🌍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Search properties worldwide
            </h3>
            <p className="text-gray-500">
              Enter a city above to start exploring real estate markets
            </p>
          </div>
        )}
      </div>
    </div>
  );
}