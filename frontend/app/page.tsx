"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Search, Globe, Shield, SlidersHorizontal, ArrowRight,
  MapPin, Heart, TrendingUp, TrendingDown, HelpCircle
} from "lucide-react";
import Logo from "@/components/Logo";
import Navbar from "@/components/Navbar";
import { getMarkets, type MarketOverview, type MarketsResponse } from "@/lib/api";
import { CITY_LOCAL_NAMES, formatMoney } from "@/lib/format";

function FloatingCard({ city, country, price, beds, sqm, emoji, rotate = 0, style = {} }: {
  city: string; country: string; price: string;
  beds: number; sqm: number; emoji: string;
  rotate?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20,
      padding: "16px 18px", width: 220,
      boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      transform: `rotate(${rotate}deg)`, transition: "transform 0.3s ease", ...style,
    }}
      onMouseEnter={e => (e.currentTarget.style.transform = `rotate(0deg) translateY(-6px)`)}
      onMouseLeave={e => (e.currentTarget.style.transform = `rotate(${rotate}deg)`)}>
      <div style={{
        height: 100, background: "rgba(255,255,255,0.05)", borderRadius: 12,
        marginBottom: 12, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 44, border: "1px solid rgba(255,255,255,0.06)",
      }}>{emoji}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{city}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: 3 }}>
            <MapPin size={10} />{country}
          </div>
        </div>
        <div style={{
          background: "#FF5A1F", borderRadius: 8, padding: "4px 10px",
          fontSize: 12, fontWeight: 800, color: "#fff",
          boxShadow: "0 4px 12px rgba(255,90,31,0.4)",
        }}>{price}</div>
      </div>
      <div style={{
        display: "flex", gap: 14, marginTop: 10, paddingTop: 10,
        borderTop: "1px solid rgba(255,255,255,0.07)",
        fontSize: 11, color: "rgba(255,255,255,0.4)",
      }}>
        <span>🛏 {beds} beds</span><span>📐 {sqm}m²</span>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, gradient }: { icon: React.ReactNode; title: string; desc: string; gradient: string; }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      background: "#fff", borderRadius: 20, padding: "28px 24px",
      boxShadow: h ? "0 20px 48px rgba(11,24,41,0.14)" : "0 4px 20px rgba(11,24,41,0.07)",
      border: "1px solid #F0F2F5",
      transform: h ? "translateY(-4px)" : "translateY(0)", transition: "all 0.3s ease",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16, background: gradient,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 18, color: "#fff",
      }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1829", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.65 }}>{desc}</div>
    </div>
  );
}

const CITY_EMOJI: Record<string, string> = {
  Baku: "🔥", Sumgait: "🌊", Ganja: "🏛️", Mingachevir: "⚡", Lankaran: "🍵",
  Shaki: "🏰", Gabala: "⛰️", Guba: "🍎",
};

function LocationCard({ market }: { market: MarketOverview }) {
  const [h, setH] = useState(false);
  const trend = market.price_trend_30d;
  return (
    <Link href={`/search?city=${encodeURIComponent(market.city)}`} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      background: "#fff", borderRadius: 18, overflow: "hidden", textDecoration: "none", color: "inherit",
      boxShadow: h ? "0 20px 48px rgba(11,24,41,0.14)" : "0 4px 16px rgba(11,24,41,0.07)",
      border: "1px solid #F0F2F5", display: "block",
      transform: h ? "translateY(-5px)" : "translateY(0)", transition: "all 0.3s ease",
    }}>
      <div style={{
        height: 120, background: "linear-gradient(135deg, #0B1829 0%, #1a3a5c 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 46, position: "relative",
      }}>
        {CITY_EMOJI[market.city] ?? "🏙️"}
        <div style={{
          position: "absolute", top: 12, right: 12, background: "#FF5A1F",
          borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 800, color: "#fff",
        }}>{market.listings} listings</div>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1829", marginBottom: 2 }}>{market.city}</div>
        <div style={{ fontSize: 12, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
          <MapPin size={11} />{CITY_LOCAL_NAMES[market.city] ?? market.city}{market.districts.length > 1 ? ` · ${market.districts.length} districts` : ""}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
          <span style={{ color: "#6B7280" }}>
            {market.median_sale_price_sqm != null ? <><b style={{ color: "#0B1829" }}>{formatMoney(market.median_sale_price_sqm, market.currency, true)}</b>/m²</> : "—"}
          </span>
          {trend != null && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontWeight: 700, color: trend >= 0 ? "#DC2626" : "#16A34A" }}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{trend > 0 ? "+" : ""}{trend.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function StepCard({ num, icon, title, desc }: { num: string; icon: React.ReactNode; title: string; desc: string; }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      background: h ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)",
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      border: `1px solid ${h ? "rgba(255,90,31,0.3)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 20, padding: "28px 24px", flex: 1,
      position: "relative", overflow: "hidden",
      transform: h ? "translateY(-4px)" : "translateY(0)", transition: "all 0.3s ease",
    }}>
      <div style={{
        position: "absolute", top: 14, right: 18, fontSize: 56, fontWeight: 900,
        color: "rgba(255,90,31,0.12)", lineHeight: 1, userSelect: "none",
      }}>{num}</div>
      <div style={{
        width: 46, height: 46, borderRadius: 14, background: "rgba(255,90,31,0.15)",
        border: "1px solid rgba(255,90,31,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 18, color: "#FF5A1F",
      }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.48)", lineHeight: 1.65 }}>{desc}</div>
    </div>
  );
}

export default function HomePage() {
  const [markets, setMarkets] = useState<MarketsResponse | null>(null);
  useEffect(() => {
    getMarkets().then(setMarkets).catch(() => setMarkets(null));
  }, []);
  const cities = markets?.total_cities ?? 8;
  const listingsCount = markets ? markets.total_listings.toLocaleString("en-US") : "1,000+";
  const bakuDistricts = markets?.markets.find(m => m.city === "Baku")?.districts ?? [];
  const districtCount = bakuDistricts.length || 11;

  return (
    <div style={{ fontFamily: "'Inter', 'Geist', sans-serif", overflowX: "hidden" }}>

      <Navbar variant="overlay" />

      {/* HERO */}
      <section style={{
        minHeight: "100vh",
        background: "linear-gradient(140deg, #050D1A 0%, #0B1829 45%, #0D2040 100%)",
        position: "relative", display: "flex", alignItems: "center",
        paddingTop: 64, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }} />
        <div style={{
          position: "absolute", top: "10%", right: "8%", width: 500, height: 500,
          borderRadius: "50%", pointerEvents: "none",
          background: "radial-gradient(circle, rgba(255,90,31,0.12) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: "5%", left: "0%", width: 400, height: 400,
          borderRadius: "50%", pointerEvents: "none",
          background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
        }} />
        <div className="vc-two-col vc-pad" style={{
          maxWidth: 1200, margin: "0 auto", padding: "60px 48px",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 60, alignItems: "center", width: "100%", position: "relative",
        }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,90,31,0.12)", border: "1px solid rgba(255,90,31,0.28)",
              borderRadius: 100, padding: "6px 16px",
              fontSize: 12, color: "#FF8C52", fontWeight: 500, marginBottom: 28,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF5A1F", display: "inline-block" }} />
              {cities} Cities &nbsp;•&nbsp; {listingsCount} Listings &nbsp;•&nbsp; Prices in ₼
            </div>
            <h1 style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.06, letterSpacing: "-2.5px", marginBottom: 22 }}>
              <span style={{ color: "#fff" }}>Your Home</span><br />
              <span style={{ color: "#FF5A1F" }}>in Azerbaijan.</span>
            </h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.52)", lineHeight: 1.75, marginBottom: 38, maxWidth: 440 }}>
              Search apartments and houses in all {districtCount} districts of Baku, Sumgait, Ganja and {Math.max(cities - 3, 0)} more cities. Every listing gets a value score, so underpriced homes stand out.
            </p>
            <div style={{ display: "flex", gap: 14, marginBottom: 52 }}>
              <Link href="/search" style={{
                background: "#FF5A1F", color: "#fff", textDecoration: "none",
                borderRadius: 12, padding: "15px 30px", fontSize: 15, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 9,
                boxShadow: "0 8px 32px rgba(255,90,31,0.38)", transition: "all 0.25s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 40px rgba(255,90,31,0.5)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(255,90,31,0.38)"; }}>
                <Search size={16} /> Explore Now
              </Link>
              <a href="#how-it-works" style={{
                background: "rgba(255,255,255,0.07)", color: "#fff", textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.16)", borderRadius: 12,
                padding: "15px 30px", fontSize: 15, fontWeight: 500,
                display: "flex", alignItems: "center", gap: 9, cursor: "pointer",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}>
                <HelpCircle size={15} /> How it works
              </a>
            </div>
            <div style={{ display: "flex", gap: 44 }}>
              {[{ val: String(cities), lbl: "Cities" }, { val: listingsCount, lbl: "Properties" }, { val: String(districtCount), lbl: "Baku districts" }].map(s => (
                <div key={s.lbl}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-1px", lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 4 }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="vc-hide-mobile" style={{ position: "relative", height: 500 }}>
            <FloatingCard city="Səbail" country="Baku" price="₼640K" beds={3} sqm={110} emoji="🌊" rotate={3} style={{ position: "absolute", top: 10, right: 10 }} />
            <FloatingCard city="Nərimanov" country="Baku" price="₼245K" beds={2} sqm={78} emoji="🏙️" rotate={-4} style={{ position: "absolute", top: 180, left: 0 }} />
            <FloatingCard city="Qəbələ" country="Gabala" price="₼310K" beds={4} sqm={220} emoji="⛰️" rotate={2} style={{ position: "absolute", bottom: 10, right: 50 }} />
          </div>
        </div>
      </section>

      {/* FEATURES + PROPERTY GRID */}
      <section style={{ padding: "88px 0 72px", background: "#F8F9FB" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{
              display: "inline-block", background: "rgba(255,90,31,0.08)",
              border: "1px solid rgba(255,90,31,0.2)", borderRadius: 100,
              padding: "4px 16px", fontSize: 12, color: "#FF5A1F", fontWeight: 600, marginBottom: 14,
            }}>Why VeloCite?</div>
            <h2 style={{ fontSize: 38, fontWeight: 800, color: "#0B1829", letterSpacing: "-1.2px", marginBottom: 14 }}>Everything You Need</h2>
            <p style={{ fontSize: 15, color: "#6B7280", maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
              One platform to search and compare homes across Azerbaijan, from central Baku to the regions.
            </p>
          </div>
          <div className="vc-two-col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 24 }}>
            <FeatureCard icon={<Globe size={24} />} title="All of Azerbaijan"
              desc={`Search every district of Baku and ${Math.max(cities - 1, 0)} regional cities in one place, with prices in manat, dollars or euros.`}
              gradient="linear-gradient(135deg, #3B82F6, #2563EB)" />
            <FeatureCard icon={<SlidersHorizontal size={24} />} title="Smart Filters"
              desc="Filter by district, price, area, rooms, property type and sale or rent; see results on a map."
              gradient="linear-gradient(135deg, #FF5A1F, #FF8C00)" />
            <FeatureCard icon={<Shield size={24} />} title="AI Value Scoring"
              desc="Every listing gets a 0–10 score against similar homes in its own district, so you instantly see what is underpriced."
              gradient="linear-gradient(135deg, #0B1829, #1a3a5c)" />
          </div>
          <div id="locations" style={{ scrollMarginTop: 90, display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "48px 0 18px" }}>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: "#0B1829", letterSpacing: "-0.6px" }}>Explore Cities</h3>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>Median sale price per m² · 30-day trend</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
            {markets
              ? markets.markets.slice(0, 8).map(m => <LocationCard key={`${m.country_code}-${m.city}`} market={m} />)
              : Array.from({ length: 4 }, (_, i) => <div key={i} className="vc-skeleton" style={{ height: 200 }} />)}
          </div>
          <div style={{ textAlign: "center" }}>
            <Link href="/search" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 14, fontWeight: 700, color: "#FF5A1F", textDecoration: "none", transition: "gap 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.gap = "12px")}
              onMouseLeave={e => (e.currentTarget.style.gap = "6px")}>
              View All Properties <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* 3 STEPS */}
      <section id="how-it-works" style={{ scrollMarginTop: 64,
        background: "linear-gradient(140deg, #050D1A 0%, #0B1829 100%)",
        padding: "80px 0", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-1px", marginBottom: 12 }}>Find Your Home in 3 Steps</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.42)", maxWidth: 380, margin: "0 auto" }}>Simple, fast and transparent — from first search to keys in hand.</p>
          </div>
          <div className="vc-stack-mobile" style={{ display: "flex", gap: 20 }}>
            <StepCard num="1" icon={<Search size={20} />} title="Search" desc={`Enter your city, budget, and preferences. Our engine searches ${listingsCount} listings instantly across ${cities} cities.`} />
            <StepCard num="2" icon={<TrendingUp size={20} />} title="Compare" desc="Compare properties side by side using AI value scores, price per m², and market position indicators." />
            <StepCard num="3" icon={<Heart size={20} />} title="Save" desc="Create a free account to save favourites, pick your default currency and track asking-price changes." />
          </div>
        </div>
      </section>

      {/* BAKU DISTRICTS + CTA */}
      <section style={{ background: "linear-gradient(140deg, #060E1C 0%, #0B1829 100%)", padding: "80px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-1px", marginBottom: 12 }}>Baku by District</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.38)" }}>Median sale price per m² — click a district to see its listings.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 56 }}>
            {bakuDistricts.map(d => (
              <Link key={d.district} href={`/search?city=Baku&district=${encodeURIComponent(d.district)}`} style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14,
                padding: "16px 18px", textDecoration: "none", display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{d.district}</span>
                <span style={{ color: "#FF8C52", fontWeight: 700, fontSize: 13 }}>
                  {d.median_sale_price_sqm != null ? `${formatMoney(d.median_sale_price_sqm, markets?.currency ?? "AZN")}/m²` : "—"}
                </span>
              </Link>
            ))}
          </div>
          <div style={{
            background: "linear-gradient(135deg, #FF5A1F 0%, #1a3a5c 100%)",
            borderRadius: 28, padding: "52px 56px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32,
            boxShadow: "0 24px 60px rgba(255,90,31,0.2)",
          }}>
            <div>
              <h3 style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-0.8px", marginBottom: 10 }}>Ready to Find Your Home?</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.68)", maxWidth: 420, lineHeight: 1.65 }}>
                Create a free account to save listings, pick your currency and come back to them any time.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              <Link href="/search" style={{
                background: "#fff", color: "#FF5A1F", textDecoration: "none",
                borderRadius: 12, padding: "14px 28px", fontSize: 14, fontWeight: 800,
                transition: "transform 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "scale(1.03)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "scale(1)"}>
                Browse Properties
              </Link>
              <Link href="/login?mode=register" style={{
                background: "rgba(255,255,255,0.12)", color: "#fff", textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.25)", borderRadius: 12,
                padding: "14px 28px", fontSize: 14, fontWeight: 500, cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="vc-pad" style={{ background: "#050D1A", padding: "52px 48px 28px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="vc-two-col" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 44 }}>
            <div>
              <div style={{ marginBottom: 16 }}><Logo size={30} /></div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", lineHeight: 1.75, maxWidth: 260 }}>
                Real estate search for Azerbaijan with value scoring, market analytics and prices in manat.
              </p>
            </div>
            {[
              { title: "Explore", links: [["Search Properties", "/search"], ["Map View", "/search?view=map"], ["Newest Listings", "/search?sort=newest"], ["Rentals", "/search?listing_type=rent"]] },
              { title: "Locations", links: ["Baku", "Sumgait", "Ganja", "Gabala", "Lankaran"].map(c => [c, `/search?city=${encodeURIComponent(c)}`]) },
              { title: "Account", links: [["Sign In", "/login"], ["Create Account", "/login?mode=register"], ["Saved Listings", "/favorites"], ["How It Works", "/#how-it-works"]] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.22)", letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 18 }}>{col.title}</div>
                {col.links.map(([label, href]) => (
                  <Link key={label} href={href} style={{ display: "block", fontSize: 13, color: "rgba(255,255,255,0.42)", marginBottom: 11, textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.42)")}>{label}</Link>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© 2026 VeloCite. Demo listings are generated from typical market prices in Azerbaijan.</span>
          </div>
        </div>
      </footer>

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  );
}