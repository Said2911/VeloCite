"use client";

import Link from "next/link";
import { BedDouble, MapPin, Ruler, Star } from "lucide-react";
import FavoriteButton from "@/components/FavoriteButton";
import type { Listing } from "@/lib/api";
import { CITY_LOCAL_NAMES, POSITION_STYLES, formatMoney, formatPrice, propertyEmoji, scoreColor } from "@/lib/format";

export default function ListingCard({ listing }: { listing: Listing }) {
  const position = POSITION_STYLES[listing.market_position ?? ""] ?? POSITION_STYLES.insufficient_data;

  return (
    <div className="vc-card">
      {/* Sibling of the link (not inside it) so the button stays valid HTML */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}>
        <FavoriteButton listingId={listing.id} />
      </div>
      <Link href={`/listings/${listing.id}?currency=${listing.currency}`} style={{ color: "inherit", textDecoration: "none", display: "block" }}>
      <div style={{
        height: 160, position: "relative", fontSize: 48,
        background: "linear-gradient(135deg, #0B1829 0%, #1a3a5c 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {propertyEmoji(listing.property_type)}
        {listing.value_score != null && (
          <div title="Value score (0–10, higher = better deal)" style={{
            position: "absolute", top: 12, left: 12, background: scoreColor(listing.value_score),
            borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 800, color: "#fff",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <Star size={10} fill="#fff" /> {listing.value_score.toFixed(1)}
          </div>
        )}
        <div style={{
          position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,0.92)",
          borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: position.color,
        }}>
          {position.label}
        </div>
      </div>

      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, color: "#FF5A1F", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 3 }}>
              {listing.property_type} · for {listing.listing_type}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1829", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {listing.district || listing.city}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0B1829" }}>
              {formatPrice(listing.price_display, listing.currency, listing.listing_type)}
            </div>
            {listing.price_per_sqm_display != null && (
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                {formatMoney(listing.price_per_sqm_display, listing.currency)}/m²
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#9CA3AF", marginBottom: 12 }}>
          <MapPin size={11} /> {CITY_LOCAL_NAMES[listing.city] ?? listing.city}, Azerbaijan
        </div>
        <div style={{ display: "flex", gap: 16, paddingTop: 12, borderTop: "1px solid #F0F2F5", fontSize: 12, color: "#6B7280" }}>
          {listing.bedrooms != null && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <BedDouble size={12} /> {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bd`}
            </span>
          )}
          {listing.area_sqm != null && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Ruler size={12} /> {Math.round(listing.area_sqm)} m²</span>
          )}
          {listing.year_built != null && <span style={{ color: "#B0B7C3" }}>Built {listing.year_built}</span>}
        </div>
      </div>
      </Link>
    </div>
  );
}

export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="vc-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="vc-skeleton" style={{ height: 300, animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}
