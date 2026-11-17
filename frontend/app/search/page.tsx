"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, LayoutGrid, Map as MapIcon, MapPin, Search, SlidersHorizontal } from "lucide-react";
import ListingCard, { ListingGridSkeleton } from "@/components/ListingCard";
import ListingsMap from "@/components/ListingsMap";
import MarketSummaryPanel from "@/components/MarketSummaryPanel";
import Navbar from "@/components/Navbar";
import Pagination from "@/components/Pagination";
import { searchListings, type SearchParams, type SearchResponse, type SortOption } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BAKU_DISTRICTS, CITIES, CITY_LOCAL_NAMES, CURRENCIES } from "@/lib/format";

const PAGE_SIZE = 12;
const MAP_PAGE_SIZE = 100;

const SORT_LABELS: Record<SortOption, string> = {
  value: "Best value",
  relevance: "Relevance",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  ppsqm_asc: "Price per m²: lowest",
  newest: "Newest",
  area_desc: "Largest",
};

interface Filters {
  city: string;
  district: string;
  listing_type: "sale" | "rent";
  property_type: string;
  min_price: string;
  max_price: string;
  min_area: string;
  bedrooms: string;
  currency: string;
  sort: SortOption;
}

function filtersFromUrl(sp: URLSearchParams, fallbackCurrency: string): Filters {
  const sort = sp.get("sort") as SortOption | null;
  return {
    city: sp.get("city") ?? "",
    district: sp.get("district") ?? "",
    listing_type: sp.get("listing_type") === "rent" ? "rent" : "sale",
    property_type: sp.get("property_type") ?? "",
    min_price: sp.get("min_price") ?? "",
    max_price: sp.get("max_price") ?? "",
    min_area: sp.get("min_area") ?? "",
    bedrooms: sp.get("bedrooms") ?? "",
    currency: sp.get("currency") ?? fallbackCurrency,
    sort: sort && sort in SORT_LABELS ? sort : "value",
  };
}

const num = (v: string) => (v === "" ? undefined : Number(v));

/** Filter form. Re-mounted (via `key`) whenever the URL changes, so it always starts from the applied filters. */
function SearchPanel({ initial, loading, onSubmit }: {
  initial: Filters; loading: boolean; onSubmit: (filters: Filters) => void;
}) {
  const [form, setForm] = useState<Filters>(initial);
  const [showFilters, setShowFilters] = useState(
    Boolean(initial.property_type || initial.min_price || initial.max_price || initial.min_area || initial.bedrooms),
  );

  const priceError = form.min_price !== "" && form.max_price !== "" && Number(form.min_price) > Number(form.max_price)
    ? "Min price is higher than max price" : null;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (priceError) return;
    onSubmit(form);
  };

  const setField = <K extends keyof Filters>(key: K, value: Filters[K]) => setForm(f => ({ ...f, [key]: value }));
  const nonNegative = (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === "" || Number(v) >= 0) setField(key, v as never);
  };
  const blockSigns = (e: React.KeyboardEvent) => ["-", "e", "E", "+"].includes(e.key) && e.preventDefault();

  const darkInput: React.CSSProperties = {
    width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 14, color: "#fff",
    outline: "none", fontFamily: "inherit",
  };

  return (
      <div className="vc-pad" style={{ background: "linear-gradient(140deg, #050D1A 0%, #0B1829 100%)", padding: "36px 48px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <form onSubmit={submit} style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.8px", marginBottom: 20 }}>Search Properties</h1>

          <div className="vc-stack-mobile" style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 2, position: "relative" }}>
              <MapPin size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none" }} />
              <select value={form.city} aria-label="City" style={{ ...darkInput, paddingLeft: 38 }}
                onChange={e => setForm(f => ({ ...f, city: e.target.value, district: "" }))}>
                <option value="">All of Azerbaijan</option>
                {CITIES.map(c => <option key={c} value={c}>{c} ({CITY_LOCAL_NAMES[c]})</option>)}
              </select>
            </div>
            {form.city === "Baku" && (
              <select value={form.district} aria-label="District" style={{ ...darkInput, flex: 1 }}
                onChange={e => setField("district", e.target.value)}>
                <option value="">All districts</option>
                {BAKU_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden" }}>
              {(["sale", "rent"] as const).map(type => (
                <button type="button" key={type} onClick={() => setField("listing_type", type)} style={{ flex: 1, padding: "12px 22px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: form.listing_type === type ? "#FF5A1F" : "transparent", color: form.listing_type === type ? "#fff" : "rgba(255,255,255,0.5)", transition: "all 0.2s", fontFamily: "inherit" }}>
                  {type === "sale" ? "For Sale" : "For Rent"}
                </button>
              ))}
            </div>
            <button type="submit" className="vc-btn-primary" disabled={loading || !!priceError} style={{ padding: "12px 28px", justifyContent: "center" }}>
              <Search size={15} />{loading ? "Searching..." : "Search"}
            </button>
          </div>

          <button type="button" onClick={() => setShowFilters(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", fontSize: 13, display: "flex", alignItems: "center", gap: 6, padding: 0, fontFamily: "inherit" }}>
            <SlidersHorizontal size={13} /> Advanced Filters
            <ChevronDown size={13} style={{ transform: showFilters ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
          </button>

          {showFilters && (
            <div className="vc-stack-mobile" style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <select aria-label="Property type" value={form.property_type} onChange={e => setField("property_type", e.target.value)} style={darkInput}>
                <option value="">Any type</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="commercial">Commercial</option>
                <option value="land">Land</option>
              </select>
              <input aria-label="Minimum price" value={form.min_price} onChange={nonNegative("min_price")} onKeyDown={blockSigns} placeholder={`Min price (${form.currency})`} type="number" min="0" style={darkInput} />
              <input aria-label="Maximum price" value={form.max_price} onChange={nonNegative("max_price")} onKeyDown={blockSigns} placeholder={`Max price (${form.currency})`} type="number" min="0" style={darkInput} />
              <input aria-label="Minimum area" value={form.min_area} onChange={nonNegative("min_area")} onKeyDown={blockSigns} placeholder="Min area (m²)" type="number" min="0" style={darkInput} />
              <select aria-label="Bedrooms" value={form.bedrooms} onChange={e => setField("bedrooms", e.target.value)} style={darkInput}>
                <option value="">Any rooms</option>
                <option value="0">Studio</option>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} bedroom{n > 1 ? "s" : ""}</option>)}
                <option value="5">5+ bedrooms</option>
              </select>
              <select aria-label="Currency" value={form.currency} onChange={e => setField("currency", e.target.value)} style={darkInput}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {priceError && <div style={{ color: "#FCA5A5", fontSize: 12, marginTop: 10 }}>{priceError}</div>}
        </form>
      </div>

  );
}

function SearchPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const defaultCurrency = user?.preferred_currency ?? "AZN";
  const urlKey = searchParams.toString();
  const applied = useMemo(
    () => filtersFromUrl(new URLSearchParams(urlKey), defaultCurrency),
    [urlKey, defaultCurrency],
  );
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const view = searchParams.get("view") === "map" ? "map" : "grid";
  const requestKey = `${urlKey}|${defaultCurrency}`;

  // Result of the latest finished request; "loading" = it belongs to an older URL
  const [result, setResult] = useState<{ key: string; data: SearchResponse | null; error: string | null } | null>(null);
  const loading = result?.key !== requestKey;
  const data = result?.data ?? null;
  const error = loading ? null : result?.error ?? null;

  // Fetch whenever the URL (= applied filters) changes
  useEffect(() => {
    let cancelled = false;
    const params: SearchParams = {
      city: applied.city || undefined,
      district: applied.district || undefined,
      listing_type: applied.listing_type,
      property_type: applied.property_type || undefined,
      min_price: num(applied.min_price),
      max_price: num(applied.max_price),
      min_area: num(applied.min_area),
      bedrooms: num(applied.bedrooms),
      currency: applied.currency,
      sort: applied.sort,
      page: view === "map" ? 1 : page,
      page_size: view === "map" ? MAP_PAGE_SIZE : PAGE_SIZE,
    };
    searchListings(params)
      .then(res => { if (!cancelled) setResult({ key: requestKey, data: res, error: null }); })
      .catch(e => { if (!cancelled) setResult({ key: requestKey, data: null, error: e.message || "Search failed" }); });
    return () => { cancelled = true; };
  }, [applied, page, view, requestKey]);

  const pushUrl = (next: Partial<Filters>, extra: Record<string, string | number | undefined> = {}) => {
    const merged = { ...applied, ...next };
    const qs = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v === "" || v === undefined) return;
      if (k === "listing_type" && v === "sale") return;
      if (k === "sort" && v === "value") return;
      if (k === "currency" && v === defaultCurrency) return;
      qs.set(k, String(v));
    });
    const rest: Record<string, string | number | undefined> = { view: view === "map" ? "map" : undefined, ...extra };
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && !(k === "page" && Number(v) === 1)) qs.set(k, String(v));
    });
    router.push(`${pathname}${qs.toString() ? `?${qs}` : ""}`, { scroll: false });
  };

  const total = data?.total ?? 0;
  const listings = data?.listings ?? [];

  return (
    <div style={{ fontFamily: "'Inter', 'Geist', sans-serif", background: "#F8F9FB", minHeight: "100vh" }}>
      <Navbar />

      <SearchPanel key={requestKey} initial={applied} loading={loading} onSubmit={f => pushUrl(f, { page: 1 })} />

      {/* RESULTS */}
      <div className="vc-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 48px 60px" }}>
        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "14px 18px", fontSize: 14, color: "#DC2626", marginBottom: 24 }}>{error}</div>
        )}

        {/* Toolbar */}
        <div className="vc-stack-mobile" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0B1829" }}>
            {loading && !data ? "Searching…" : `${total.toLocaleString("en-US")} ${total === 1 ? "property" : "properties"} found`}
            {applied.city && <span style={{ color: "#9CA3AF", fontWeight: 400 }}> in {applied.district ? `${applied.district}, ` : ""}{applied.city}</span>}
          </h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select aria-label="Sort by" value={applied.sort} onChange={e => pushUrl({ sort: e.target.value as SortOption }, { page: 1 })} className="vc-input" style={{ width: "auto", padding: "9px 12px", fontSize: 13 }}>
              {(Object.keys(SORT_LABELS) as SortOption[]).map(s => <option key={s} value={s}>{SORT_LABELS[s]}</option>)}
            </select>
            <div style={{ display: "flex", border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
              {([["grid", LayoutGrid], ["map", MapIcon]] as const).map(([v, Icon]) => (
                <button key={v} aria-label={`${v} view`} aria-pressed={view === v} onClick={() => {
                  const qs = new URLSearchParams(searchParams.toString());
                  if (v === "map") qs.set("view", "map"); else qs.delete("view");
                  qs.delete("page");
                  router.push(`${pathname}?${qs}`, { scroll: false });
                }} style={{ padding: "8px 12px", border: "none", cursor: "pointer", background: view === v ? "#0B1829" : "transparent", color: view === v ? "#fff" : "#6B7280", display: "flex" }}>
                  <Icon size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {data?.market_summary && !loading && (
          <div style={{ marginBottom: 24 }}>
            <MarketSummaryPanel
              summary={data.market_summary}
              rent={applied.listing_type === "rent"}
              title={`Market snapshot — ${applied.district || applied.city || "Azerbaijan"} (${applied.listing_type === "rent" ? "rent" : "sale"})`}
            />
          </div>
        )}

        {loading && <ListingGridSkeleton />}

        {!loading && !error && listings.length === 0 && (
          <div style={{ textAlign: "center", padding: "70px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0B1829", marginBottom: 8 }}>No listings found</h2>
            <p style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 24 }}>Try a different city or loosen your filters.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              {CITIES.map(c => (
                <button key={c} className="vc-btn-outline" style={{ borderRadius: 100 }} onClick={() => pushUrl({ ...applied, city: c, district: "" }, { page: 1 })}>{c}</button>
              ))}
            </div>
          </div>
        )}

        {!loading && listings.length > 0 && view === "map" && (
          <>
            <ListingsMap listings={listings} />
            {total > listings.length && (
              <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 10 }}>
                Showing the top {listings.length} of {total.toLocaleString("en-US")} results on the map. Narrow your search to see the rest.
              </p>
            )}
          </>
        )}

        {!loading && listings.length > 0 && view === "grid" && (
          <>
            <div className="vc-grid">
              {listings.map(listing => <ListingCard key={listing.id} listing={listing} />)}
            </div>
            <Pagination page={page} totalPages={data?.total_pages ?? 1} onChange={p => {
              pushUrl({}, { page: p });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }} />
          </>
        )}
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.28); }
        .vc-input::placeholder { color: #9CA3AF; }
        select option { background: #0B1829; color: #fff; }
        .vc-input option { background: #fff; color: #0B1829; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
