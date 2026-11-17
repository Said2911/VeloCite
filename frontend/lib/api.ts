// lib/api.ts
// Typed client for the VeloCite FastAPI backend

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001").replace(/\/$/, "");

const TOKEN_KEY = "velocite_token";

export const DEFAULT_CURRENCY = "AZN";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortOption = "relevance" | "value" | "price_asc" | "price_desc" | "newest" | "area_desc" | "ppsqm_asc";

export interface SearchParams {
  city?: string;
  district?: string;
  country_code?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  property_type?: string;
  listing_type?: "sale" | "rent";
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  bedrooms?: number;
  currency?: string;
  sort?: SortOption;
  page?: number;
  page_size?: number;
}

export interface Listing {
  id: string;
  country_code: string;
  city: string;
  district?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  property_type: string;
  listing_type: "sale" | "rent";
  area_sqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  year_built?: number | null;
  price_usd: number;
  price_display: number;
  price_per_sqm_display?: number | null;
  currency: string;
  currency_symbol: string;
  value_score?: number | null;
  market_position?: string | null;
  source?: string | null;
  url?: string | null;
  description?: string | null;
  listed_at?: string | null;
}

export interface MarketSummary {
  currency: string;
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
  total_pages: number;
  sort: SortOption;
  market_summary?: MarketSummary | null;
}

export interface PricePoint {
  date: string;
  price_display: number;
}

export interface ListingDetail {
  listing: Listing;
  segment: "district" | "city";
  percentile?: number | null;
  market?: MarketSummary | null;
  comparables: Listing[];
  price_history: PricePoint[];
}

export interface DistrictOverview {
  district: string;
  listings: number;
  median_sale_price_sqm?: number | null;
  median_rent_price_sqm?: number | null;
}

export interface MarketOverview {
  country_code: string;
  city: string;
  lat?: number | null;
  lng?: number | null;
  listings: number;
  sale_listings: number;
  rent_listings: number;
  median_sale_price_sqm?: number | null;
  median_rent_price_sqm?: number | null;
  avg_value_score?: number | null;
  price_trend_30d?: number | null;
  currency: string;
  districts: DistrictOverview[];
}

export interface MarketsResponse {
  total_listings: number;
  total_cities: number;
  total_districts: number;
  currency: string;
  markets: MarketOverview[];
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  preferred_currency: string;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ─── Token storage ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — session-only login */
  }
}

// ─── Request helper ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Free hosting puts the API to sleep when idle; the first request then takes up to a
// minute. Requests slower than SLOW_REQUEST_MS raise a "velocite:slow" window event
// so the UI can explain the wait (see components/WakeNotice.tsx).
const SLOW_REQUEST_MS = 4000;
let slowRequests = 0;

function emitSlow(delta: number) {
  if (typeof window === "undefined") return;
  slowRequests = Math.max(0, slowRequests + delta);
  window.dispatchEvent(new CustomEvent("velocite:slow", { detail: slowRequests > 0 }));
}

async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let markedSlow = false;
  const timer = typeof window !== "undefined"
    ? window.setTimeout(() => { markedSlow = true; emitSlow(1); }, SLOW_REQUEST_MS)
    : undefined;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Cannot reach the VeloCite API. If the site was idle, the server may still be waking up — try again in a minute.");
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
    if (markedSlow) emitSlow(-1);
  }

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) message = body.detail[0].msg;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function toQuery(params: object): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.append(key, String(value));
  });
  const s = query.toString();
  return s ? `?${s}` : "";
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export function searchListings(params: SearchParams): Promise<SearchResponse> {
  return request<SearchResponse>(`/api/v1/search${toQuery(params)}`);
}

export function getListing(id: string, currency = DEFAULT_CURRENCY): Promise<ListingDetail> {
  return request<ListingDetail>(`/api/v1/listings/${encodeURIComponent(id)}${toQuery({ currency })}`);
}

export function getMarkets(currency = DEFAULT_CURRENCY): Promise<MarketsResponse> {
  return request<MarketsResponse>(`/api/v1/markets${toQuery({ currency })}`);
}

export function getCurrencies(): Promise<Record<string, string>> {
  return request<Record<string, string>>("/api/v1/currencies");
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function register(email: string, password: string, full_name?: string): Promise<TokenResponse> {
  return request<TokenResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: full_name || null }),
  });
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getMe(): Promise<User> {
  return request<User>("/api/v1/auth/me", {}, true);
}

export function updateMe(data: { full_name?: string; preferred_currency?: string }): Promise<User> {
  return request<User>("/api/v1/auth/me", { method: "PATCH", body: JSON.stringify(data) }, true);
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export function getFavorites(currency = DEFAULT_CURRENCY): Promise<Listing[]> {
  return request<Listing[]>(`/api/v1/favorites${toQuery({ currency })}`, {}, true);
}

export function getFavoriteIds(): Promise<string[]> {
  return request<string[]>("/api/v1/favorites/ids", {}, true);
}

export function addFavorite(id: string): Promise<void> {
  return request<void>(`/api/v1/favorites/${encodeURIComponent(id)}`, { method: "PUT" }, true);
}

export function removeFavorite(id: string): Promise<void> {
  return request<void>(`/api/v1/favorites/${encodeURIComponent(id)}`, { method: "DELETE" }, true);
}
