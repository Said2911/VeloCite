// lib/api.ts
// Functions for communicating with the VeloCite FastAPI backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export interface SearchParams {
  city?: string;
  country_code?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  property_type?: string;
  listing_type?: string;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  bedrooms?: number;
  currency?: string;
  page?: number;
  page_size?: number;
}

export interface Listing {
  id: string;
  country_code: string;
  city: string;
  district?: string;
  address?: string;
  lat: number;
  lng: number;
  property_type: string;
  listing_type: string;
  area_sqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  year_built?: number;
  price_usd: number;
  price_display: number;
  price_per_sqm_display?: number;
  currency: string;
  value_score: number;
  market_position: string;
  listed_at: string;
}

export interface MarketSummary {
  median_price_sqm: number;
  avg_price_sqm: number;
  listings_analyzed: number;
  price_distribution: Record<string, number>;
  bedroom_breakdown: Record<string, number>;
}

export interface SearchResponse {
  listings: Listing[];
  total: number;
  page: number;
  page_size: number;
  market_summary?: MarketSummary;
}

export async function searchListings(params: SearchParams): Promise<SearchResponse> {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });

  const response = await fetch(`${API_BASE}/api/v1/search?${query}`);

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getCurrencies(): Promise<Record<string, string>> {
  const response = await fetch(`${API_BASE}/api/v1/currencies`);
  return response.json();
}