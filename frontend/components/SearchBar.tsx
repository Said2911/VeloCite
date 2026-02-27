"use client";

import { useState } from "react";
import type { SearchParams } from "@/lib/api";

const CURRENCIES = [
  "USD", "EUR", "GBP", "AED", "JPY",
  "CHF", "AUD", "CAD", "SGD", "INR",
];

const PROPERTY_TYPES = [
  { value: "", label: "Any type" },
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "villa", label: "Villa" },
  { value: "commercial", label: "Commercial" },
];

interface Props {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

export default function SearchBar({ onSearch, loading }: Props) {
  const [city, setCity] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [listingType, setListingType] = useState("sale");
  const [propertyType, setPropertyType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [currency, setCurrency] = useState("USD");

  const handleSearch = () => {
    onSearch({
      city: city || undefined,
      country_code: countryCode || undefined,
      listing_type: listingType,
      property_type: propertyType || undefined,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      currency,
      page: 1,
      page_size: 20,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 text-gray-800">

      {/* Row 1: City + Country + Listing Type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input
          type="text"
          placeholder="City (e.g. Berlin, Dubai)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Country code (e.g. DE, US)"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))}
          className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setListingType("sale")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              listingType === "sale"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            For Sale
          </button>
          <button
            onClick={() => setListingType("rent")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              listingType === "rent"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            For Rent
          </button>
        </div>
      </div>

      {/* Row 2: Property Type + Price Range + Bedrooms + Currency */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Min price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Any rooms</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n} bedroom{n > 1 ? "s" : ""}</option>
          ))}
        </select>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
      >
        {loading ? "Searching..." : "Search Properties"}
      </button>
    </div>
  );
}