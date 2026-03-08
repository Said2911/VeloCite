"use client";
import { useState } from "react";
import {
  Search, SlidersHorizontal, MapPin, BedDouble,
  ArrowLeft, ChevronDown, Star
} from "lucide-react";
import { searchListings, Listing, SearchParams } from "@/lib/api";

function ListingCard({ listing }: { listing: Listing }) {
  const [hovered, setHovered] = useState(false);
  const scoreColor = listing.value_score >= 7 ? "#22C55E" : listing.value_score >= 4 ? "#F59E0B" : "#EF4444";
  const positionStyle = listing.market_position === "underpriced"
    ? { bg: "rgba(34,197,94,0.15)", color: "#22C55E" }
    : listing.market_position === "overpriced"
    ? { bg: "rgba(239,68,68,0.15)", color: "#EF4444" }
    : { bg: "rgba(59,130,246,0.15)", color: "#3B82F6" };
  const emoji = listing.property_type === "apartment" ? "🏢" : listing.property_type === "villa" ? "🏡" : listing.property_type === "house" ? "🏠" : "🏗️";

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      background: "#fff", borderRadius: 18, overflow: "hidden",
      border: "1px solid #F0F2F5", cursor: "pointer",
      boxShadow: hovered ? "0 16px 48px rgba(11,24,41,0.14)" : "0 2px 12px rgba(11,24,41,0.07)",
      transform: hovered ? "translateY(-4px)" : "translateY(0)", transition: "all 0.3s ease",
    }}>
      <div style={{ height: 160, position: "relative", background: "linear-gradient(135deg, #0B1829 0%, #1a3a5c 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
        {emoji}
        <div style={{ position: "absolute", top: 12, left: 12, background: scoreColor, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
          <Star size={10} fill="#fff" /> {listing.value_score?.toFixed(1)}
        </div>
        <div style={{ position: "absolute", top: 12, right: 12, background: positionStyle.bg, border: `1px solid ${positionStyle.color}30`, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 600, color: positionStyle.color, backdropFilter: "blur(8px)", textTransform: "capitalize" }}>
          {listing.market_position?.replace("_", " ")}
        </div>
      </div>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "#FF5A1F", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 3 }}>{listing.property_type}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1829" }}>{listing.district || listing.city}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0B1829" }}>
              {listing.currency === "USD" ? "$" : listing.currency + " "}{listing.price_display?.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>${listing.price_per_sqm_display?.toLocaleString()}/m²</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#9CA3AF", marginBottom: 12 }}>
          <MapPin size={11} /> {listing.city}, {listing.country_code}
        </div>
        <div style={{ display: "flex", gap: 16, paddingTop: 12, borderTop: "1px solid #F0F2F5", fontSize: 12, color: "#6B7280" }}>
          {listing.bedrooms != null && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><BedDouble size={12} /> {listing.bedrooms} beds</span>}
          {listing.area_sqm && <span>📐 {listing.area_sqm}m²</span>}
          {listing.year_built && <span style={{ color: "#D1D5DB" }}>Built {listing.year_built}</span>}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [listingType, setListingType] = useState<"sale" | "rent">("sale");
  const [propertyType, setPropertyType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setSearched(true);
    setCurrentPage(1);
    try {
      const params: SearchParams = {
        city: city || undefined,
        country_code: country || undefined,
        listing_type: listingType,
        property_type: propertyType || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        currency,
        page: 1,
        page_size: 100,
      };
      const data = await searchListings(params);
      setListings(data.listings);
    } catch {
      setError("Search failed. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(listings.length / ITEMS_PER_PAGE);
  const paginatedListings = listings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 14px",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, fontSize: 14, color: "#fff",
    outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{ fontFamily: "'Inter', 'Geist', sans-serif", background: "#F8F9FB", minHeight: "100vh" }}>

      {/* TOPBAR */}
      <div style={{ background: "#0B1829", padding: "0 48px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 24px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 13, transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
            <ArrowLeft size={14} /> Home
          </a>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #FF5A1F, #FF8C00)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>V</div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>Velo<span style={{ color: "#FF5A1F" }}>Cite</span></span>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
          {searched && !loading ? `${listings.length} properties found` : "Property Search"}
        </div>
      </div>

      {/* SEARCH PANEL */}
      <div style={{ background: "linear-gradient(140deg, #050D1A 0%, #0B1829 100%)", padding: "36px 48px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.8px", marginBottom: 20 }}>Search Properties</h1>

          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 2, position: "relative" }}>
              <MapPin size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
              <input value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="City (Berlin, Dubai, Tokyo...)" style={{ ...inputStyle, paddingLeft: 38 }} />
            </div>
            <input value={country} onChange={e => setCountry(e.target.value.toUpperCase().slice(0, 2))} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="Country (DE, AE...)" style={{ ...inputStyle, flex: 1 }} />
            <div style={{ display: "flex", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden" }}>
              {(["sale", "rent"] as const).map(type => (
                <button key={type} onClick={() => setListingType(type)} style={{ padding: "12px 22px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: listingType === type ? "#FF5A1F" : "transparent", color: listingType === type ? "#fff" : "rgba(255,255,255,0.5)", transition: "all 0.2s", fontFamily: "inherit" }}>
                  {type === "sale" ? "For Sale" : "For Rent"}
                </button>
              ))}
            </div>
            <button onClick={handleSearch} disabled={loading} style={{ background: "#FF5A1F", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, opacity: loading ? 0.7 : 1, boxShadow: "0 4px 20px rgba(255,90,31,0.35)", transition: "all 0.2s", fontFamily: "inherit", whiteSpace: "nowrap" }}
              onMouseEnter={e => !loading && ((e.currentTarget.style.transform = "translateY(-1px)"), (e.currentTarget.style.boxShadow = "0 8px 28px rgba(255,90,31,0.5)"))}
              onMouseLeave={e => ((e.currentTarget.style.transform = "translateY(0)"), (e.currentTarget.style.boxShadow = "0 4px 20px rgba(255,90,31,0.35)"))}>
              <Search size={15} />{loading ? "Searching..." : "Search"}
            </button>
          </div>

          <button onClick={() => setShowFilters(!showFilters)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: 13, display: "flex", alignItems: "center", gap: 6, padding: 0, fontFamily: "inherit" }}>
            <SlidersHorizontal size={13} /> Advanced Filters
            <ChevronDown size={13} style={{ transform: showFilters ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
          </button>

          {showFilters && (
            <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                <select key="pt" value={propertyType} onChange={e => setPropertyType(e.target.value)} style={inputStyle}>
                  <option value="">Any Type</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="villa">Villa</option>
                </select>,
                <input key="min" value={minPrice} onChange={e => { const v = e.target.value; if (v === "" || Number(v) >= 0) setMinPrice(v); }} onKeyDown={e => ["-", "e", "E", "+"].includes(e.key) && e.preventDefault()} placeholder="Min Price ($)" type="number" min="0" style={inputStyle} />,
                <input key="max" value={maxPrice} onChange={e => { const v = e.target.value; if (v === "" || Number(v) >= 0) setMaxPrice(v); }} onKeyDown={e => ["-", "e", "E", "+"].includes(e.key) && e.preventDefault()} placeholder="Max Price ($)" type="number" min="0" style={inputStyle} />,
                <select key="bd" value={bedrooms} onChange={e => setBedrooms(e.target.value)} style={inputStyle}>
                  <option value="">Any Rooms</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} bedroom{n > 1 ? "s" : ""}</option>)}
                </select>,
                <select key="cur" value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
                  {["USD", "EUR", "GBP", "AED", "JPY", "CHF", "SGD"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>,
              ].map((el, i) => <div key={i} style={{ flex: 1 }}>{el}</div>)}
            </div>
          )}
        </div>
      </div>

      {/* RESULTS */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 48px" }}>
        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "14px 18px", fontSize: 14, color: "#DC2626", marginBottom: 24 }}>{error}</div>
        )}

        {!searched && !loading && (
          <div style={{ textAlign: "center", padding: "100px 0" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #0B1829, #1a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>🌍</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0B1829", marginBottom: 10 }}>Search Properties Worldwide</h2>
            <p style={{ fontSize: 14, color: "#9CA3AF", maxWidth: 360, margin: "0 auto", lineHeight: 1.7 }}>Enter a city above and hit Search to discover properties with AI value scoring across 15 cities.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
              {["Berlin", "Dubai", "Tokyo", "Barcelona", "New York", "Amsterdam"].map(c => (
                <button key={c} onClick={() => setCity(c)} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 100, padding: "7px 16px", fontSize: 13, color: "#4B5563", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget.style.borderColor = "#FF5A1F"); (e.currentTarget.style.color = "#FF5A1F"); }}
                  onMouseLeave={e => { (e.currentTarget.style.borderColor = "#E5E7EB"); (e.currentTarget.style.color = "#4B5563"); }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 300, borderRadius: 18, background: "#E9EBEE", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}

        {!loading && searched && listings.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0B1829", marginBottom: 8 }}>No listings found</h2>
            <p style={{ fontSize: 14, color: "#9CA3AF" }}>Try a different city, country or adjust your filters.</p>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0B1829" }}>
                {listings.length} properties found
                {city && <span style={{ color: "#9CA3AF", fontWeight: 400 }}> in {city}</span>}
              </h2>
              <span style={{ fontSize: 13, color: "#9CA3AF" }}>
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {paginatedListings.map(listing => <ListingCard key={listing.id} listing={listing} />)}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 48 }}>
                <button onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={currentPage === 1} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", color: currentPage === 1 ? "#D1D5DB" : "#0B1829", fontSize: 13, fontWeight: 600, cursor: currentPage === 1 ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
                  onMouseEnter={e => { if (currentPage !== 1) (e.currentTarget.style.borderColor = "#FF5A1F"); }}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#E5E7EB")}>
                  ← Prev
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  const isActive = currentPage === page;
                  const isNear = Math.abs(currentPage - page) <= 2 || page === 1 || page === totalPages;
                  if (!isNear) return page === currentPage - 3 || page === currentPage + 3
                    ? <span key={i} style={{ color: "#D1D5DB", fontSize: 13 }}>…</span>
                    : null;
                  return (
                    <button key={i} onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{
                      width: 40, height: 40, borderRadius: 10,
                      border: isActive ? "none" : "1px solid #E5E7EB",
                      background: isActive ? "#FF5A1F" : "#fff",
                      color: isActive ? "#fff" : "#0B1829",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      boxShadow: isActive ? "0 4px 12px rgba(255,90,31,0.3)" : "none",
                      fontFamily: "inherit", transition: "all 0.2s",
                    }}>{page}</button>
                  );
                })}

                <button onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={currentPage === totalPages} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", color: currentPage === totalPages ? "#D1D5DB" : "#0B1829", fontSize: 13, fontWeight: 600, cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
                  onMouseEnter={e => { if (currentPage !== totalPages) (e.currentTarget.style.borderColor = "#FF5A1F"); }}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#E5E7EB")}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
        input::placeholder { color: rgba(255,255,255,0.28); }
        select option { background: #0B1829; color: #fff; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}