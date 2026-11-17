"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Bath, BedDouble, Building2, Calendar, ExternalLink, MapPin, Ruler, Star, TrendingDown, TrendingUp } from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import ListingCard from "@/components/ListingCard";
import ListingsMap from "@/components/ListingsMap";
import MarketSummaryPanel from "@/components/MarketSummaryPanel";
import Navbar from "@/components/Navbar";
import { getListing, type ListingDetail, type PricePoint } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CITY_LOCAL_NAMES, CURRENCIES, POSITION_STYLES, formatMoney, formatPrice, propertyEmoji, scoreColor } from "@/lib/format";

function PriceHistoryChart({ points, currency }: { points: PricePoint[]; currency: string }) {
  if (points.length < 2) return null;
  const W = 560, H = 160, PAD = 28;
  const values = points.map(p => p.price_display);
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const times = points.map(p => new Date(p.date).getTime());
  const t0 = Math.min(...times), tSpan = Math.max(...times) - t0 || 1;
  const xy = points.map((p, i) => [
    PAD + ((times[i] - t0) / tSpan) * (W - 2 * PAD),
    H - PAD - ((p.price_display - min) / span) * (H - 2 * PAD),
  ]);
  const change = ((values[values.length - 1] - values[0]) / values[0]) * 100;

  return (
    <div className="vc-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0B1829" }}>Asking price history</h3>
        <span style={{ fontSize: 13, fontWeight: 700, color: change <= 0 ? "#16A34A" : "#DC2626", display: "flex", alignItems: "center", gap: 4 }}>
          {change <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
          {change > 0 ? "+" : ""}{change.toFixed(1)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Price history chart">
        <polyline fill="none" stroke="#FF5A1F" strokeWidth="2.5" points={xy.map(p => p.join(",")).join(" ")} />
        {xy.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="4" fill="#fff" stroke="#FF5A1F" strokeWidth="2" />
            <text x={x} y={H - 6} textAnchor="middle" fontSize="10" fill="#9CA3AF">
              {new Date(points[i].date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B7280" }}>
        <span>First seen: {formatMoney(values[0], currency)}</span>
        <span>Now: {formatMoney(values[values.length - 1], currency)}</span>
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,90,31,0.1)", color: "#FF5A1F", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0B1829" }}>{value}</div>
      </div>
    </div>
  );
}

function ListingPageInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const currency = searchParams.get("currency") ?? user?.preferred_currency ?? "AZN";
  const requestKey = `${id}|${currency}`;

  const [result, setResult] = useState<{ key: string; data: ListingDetail | null; error: string | null } | null>(null);
  const loading = result?.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    getListing(id, currency)
      .then(d => { if (!cancelled) setResult({ key: requestKey, data: d, error: null }); })
      .catch(e => { if (!cancelled) setResult({ key: requestKey, data: null, error: e.status === 404 ? "This listing does not exist or was removed." : e.message }); });
    return () => { cancelled = true; };
  }, [id, currency, requestKey]);

  const page = (children: React.ReactNode) => (
    <div style={{ fontFamily: "'Inter', 'Geist', sans-serif", background: "#F8F9FB", minHeight: "100vh" }}>
      <Navbar />
      <div className="vc-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 48px 64px" }}>{children}</div>
    </div>
  );

  if (loading && !result?.data) {
    return page(<div className="vc-skeleton" style={{ height: 420 }} />);
  }
  if (!result?.data) {
    return page(
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🏚️</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0B1829", marginBottom: 8 }}>Listing not available</h1>
        <p style={{ color: "#6B7280", marginBottom: 24 }}>{result?.error}</p>
        <Link href="/search" className="vc-btn-primary">Back to search</Link>
      </div>,
    );
  }

  const { listing, market, comparables, price_history, percentile, segment } = result.data;
  const scope = segment === "district" && listing.district ? `the ${listing.district} district of ${listing.city}` : listing.city;
  const position = POSITION_STYLES[listing.market_position ?? ""] ?? POSITION_STYLES.insufficient_data;
  const vsMedian = market && listing.price_per_sqm_display
    ? ((listing.price_per_sqm_display - market.median_price_sqm) / market.median_price_sqm) * 100
    : null;
  const title = `${listing.bedrooms ? `${listing.bedrooms}-bedroom ` : listing.bedrooms === 0 ? "Studio " : ""}${listing.property_type} in ${listing.district ? `${listing.district}, ` : ""}${listing.city}`;
  const similarHref = `/search?city=${encodeURIComponent(listing.city)}${segment === "district" && listing.district ? `&district=${encodeURIComponent(listing.district)}` : ""}&listing_type=${listing.listing_type}&property_type=${listing.property_type}&currency=${listing.currency}`;

  return page(
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <button onClick={() => (window.history.length > 1 ? router.back() : router.push("/search"))} className="vc-btn-outline">
          <ArrowLeft size={14} /> Back
        </button>
        <select aria-label="Currency" value={currency} className="vc-input" style={{ width: "auto", padding: "8px 12px", fontSize: 13 }}
          onChange={e => router.replace(`${pathname}?currency=${e.target.value}`, { scroll: false })}>
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* HEADER */}
      <div style={{ borderRadius: 24, overflow: "hidden", background: "linear-gradient(135deg, #0B1829 0%, #1a3a5c 100%)", padding: "36px 40px", position: "relative", marginBottom: 24, opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}>
        <div className="vc-hide-mobile" style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", fontSize: 110, opacity: 0.9 }}>{propertyEmoji(listing.property_type)}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ background: "#FF5A1F", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>For {listing.listing_type}</span>
          {listing.value_score != null && (
            <span style={{ background: scoreColor(listing.value_score), color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 4 }}>
              <Star size={11} fill="#fff" /> {listing.value_score.toFixed(1)} / 10
            </span>
          )}
          <span style={{ background: "rgba(255,255,255,0.92)", color: position.color, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>{position.label}</span>
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-0.8px", marginBottom: 8, textTransform: "capitalize", maxWidth: 700 }}>{title}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 22 }}>
          <MapPin size={14} /> {listing.address ? `${listing.address}, ` : ""}{listing.city} ({CITY_LOCAL_NAMES[listing.city] ?? listing.city}), Azerbaijan
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>{formatPrice(listing.price_display, listing.currency, listing.listing_type)}</div>
            {listing.price_per_sqm_display != null && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{formatMoney(listing.price_per_sqm_display, listing.currency)} per m²{listing.listing_type === "rent" ? " / month" : ""}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
            <FavoriteButton listingId={listing.id} withLabel />
            {listing.url && (
              <a href={listing.url} target="_blank" rel="noopener noreferrer" className="vc-btn-primary"><ExternalLink size={14} /> Original listing</a>
            )}
          </div>
        </div>
      </div>

      <div className="vc-two-col" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24, alignItems: "start" }}>
        {/* LEFT */}
        <div style={{ display: "grid", gap: 24 }}>
          <div className="vc-panel">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0B1829", marginBottom: 18 }}>Key facts</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 18 }}>
              {listing.area_sqm != null && <Fact icon={<Ruler size={16} />} label="Area" value={`${Math.round(listing.area_sqm)} m²`} />}
              {listing.bedrooms != null && <Fact icon={<BedDouble size={16} />} label="Bedrooms" value={listing.bedrooms === 0 ? "Studio" : listing.bedrooms} />}
              {listing.bathrooms != null && <Fact icon={<Bath size={16} />} label="Bathrooms" value={listing.bathrooms} />}
              {listing.floor != null && <Fact icon={<Building2 size={16} />} label="Floor" value={listing.floor === 0 ? "Ground" : listing.floor} />}
              {listing.year_built != null && <Fact icon={<Calendar size={16} />} label="Year built" value={listing.year_built} />}
              {listing.listed_at && <Fact icon={<Calendar size={16} />} label="Listed" value={new Date(listing.listed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />}
            </div>
            {listing.description && <p style={{ marginTop: 20, fontSize: 14, color: "#4B5563", lineHeight: 1.7 }}>{listing.description}</p>}
            {listing.source === "generated" && (
              <p style={{ marginTop: 18, fontSize: 12, color: "#9CA3AF" }}>Demo listing generated from typical market prices in {listing.district ? `${listing.district}, ` : ""}{listing.city}.</p>
            )}
          </div>

          <div className="vc-panel">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0B1829", marginBottom: 10 }}>How the value score works</h3>
            <p style={{ fontSize: 14, color: "#4B5563", lineHeight: 1.7 }}>
              We compare the price per m² with every other {listing.property_type} for {listing.listing_type} in {scope}.
              {percentile != null && <> This listing is cheaper per m² than <b>{Math.max(0, Math.round(100 - percentile))}%</b> of {market?.listings_analyzed ?? "the"} comparable listings</>}
              {vsMedian != null && <> and is <b style={{ color: vsMedian <= 0 ? "#16A34A" : "#DC2626" }}>{Math.abs(vsMedian).toFixed(1)}% {vsMedian <= 0 ? "below" : "above"}</b> the median</>}
              {percentile != null || vsMedian != null ? "." : ""} Newer buildings get a small bonus, older ones a small penalty (up to ±10%).
            </p>
          </div>

          <PriceHistoryChart points={price_history} currency={listing.currency} />

          {listing.lat != null && listing.lng != null && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0B1829", marginBottom: 12 }}>Location</h3>
              <ListingsMap listings={[listing]} height={320} zoom={14} />
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ display: "grid", gap: 24 }}>
          {market && <MarketSummaryPanel summary={market} rent={listing.listing_type === "rent"} title={`${segment === "district" && listing.district ? listing.district : listing.city} · ${listing.property_type}s for ${listing.listing_type}`} />}
          <Link href={similarHref} className="vc-btn-outline" style={{ justifyContent: "center" }}>See similar listings in {segment === "district" && listing.district ? listing.district : listing.city} →</Link>
        </div>
      </div>

      {comparables.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0B1829", marginBottom: 18 }}>Comparable listings</h2>
          <div className="vc-grid">
            {comparables.map(c => <ListingCard key={c.id} listing={c} />)}
          </div>
        </div>
      )}
    </>,
  );
}

export default function ListingPage() {
  return (
    <Suspense fallback={null}>
      <ListingPageInner />
    </Suspense>
  );
}
