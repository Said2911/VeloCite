"use client";
import { useState, useEffect } from "react";
import {
  Search, Globe, Shield, SlidersHorizontal, ArrowRight,
  MapPin, Star, Facebook, Twitter, Linkedin, Phone, TrendingUp
} from "lucide-react";

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

function PropertyCard({ city, country, type, price, emoji }: { city: string; country: string; type: string; price: string; emoji: string; }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      background: "#fff", borderRadius: 18, overflow: "hidden",
      boxShadow: h ? "0 20px 48px rgba(11,24,41,0.14)" : "0 4px 16px rgba(11,24,41,0.07)",
      border: "1px solid #F0F2F5", cursor: "pointer",
      transform: h ? "translateY(-5px)" : "translateY(0)", transition: "all 0.3s ease",
    }}>
      <div style={{
        height: 150, background: "linear-gradient(135deg, #0B1829 0%, #1a3a5c 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 52, position: "relative",
      }}>
        {emoji}
        <div style={{
          position: "absolute", top: 12, right: 12, background: "#FF5A1F",
          borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 800, color: "#fff",
        }}>{price}</div>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 10, color: "#FF5A1F", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>{type}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0B1829", marginBottom: 4 }}>Luxury {type} — {city}</div>
        <div style={{ fontSize: 12, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 4 }}>
          <MapPin size={11} />{city}, {country}
        </div>
      </div>
    </div>
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

function TestiCard({ initials, name, location, quote }: { initials: string; name: string; location: string; quote: string; }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 20, padding: "24px", flex: 1,
    }}>
      <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
        {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="#FF5A1F" color="#FF5A1F" />)}
      </div>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", fontStyle: "italic", lineHeight: 1.7, marginBottom: 20 }}>"{quote}"</p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "linear-gradient(135deg, #FF5A1F, #FF8C00)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff",
        }}>{initials}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>{location}</div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', 'Geist', sans-serif", overflowX: "hidden" }}>

      {/* NAVBAR */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? "rgba(5,13,26,0.92)" : "rgba(5,13,26,0.35)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${scrolled ? "rgba(255,255,255,0.08)" : "transparent"}`,
        transition: "all 0.35s ease",
        padding: "0 48px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "linear-gradient(135deg, #FF5A1F 0%, #FF8C00 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: 16,
            boxShadow: "0 4px 16px rgba(255,90,31,0.4)",
          }}>V</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: "#fff", letterSpacing: "-0.4px" }}>
            Velo<span style={{ color: "#FF5A1F" }}>Cite</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 32, fontSize: 14 }}>
          {[["Explore", "/search"], ["Locations", "#"], ["About", "#"], ["Blog", "#"]].map(([item, href]) => (
            <a key={item} href={href} style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}>{item}</a>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{
            background: "rgba(255,255,255,0.08)", color: "#fff",
            border: "1px solid rgba(255,255,255,0.14)", borderRadius: 9,
            padding: "8px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}>Sign In</button>
          <a href="/search" style={{
            background: "#FF5A1F", color: "#fff", textDecoration: "none",
            borderRadius: 9, padding: "8px 20px", fontSize: 13, fontWeight: 700,
            boxShadow: "0 4px 16px rgba(255,90,31,0.35)", transition: "all 0.2s",
            display: "flex", alignItems: "center",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(255,90,31,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(255,90,31,0.35)"; }}>
            Explore Now
          </a>
        </div>
      </nav>

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
        <div style={{
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
              8+ Countries &nbsp;•&nbsp; 1,200+ Listings &nbsp;•&nbsp; 100% Verified
            </div>
            <h1 style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.06, letterSpacing: "-2.5px", marginBottom: 22 }}>
              <span style={{ color: "#fff" }}>Your Home,</span><br />
              <span style={{ color: "#FF5A1F" }}>Anywhere.</span>
            </h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.52)", lineHeight: 1.75, marginBottom: 38, maxWidth: 440 }}>
              AI-powered real estate search across Berlin, Dubai, Tokyo, New York and 11 more cities. Spot underpriced gems with our value scoring engine.
            </p>
            <div style={{ display: "flex", gap: 14, marginBottom: 52 }}>
              <a href="/search" style={{
                background: "#FF5A1F", color: "#fff", textDecoration: "none",
                borderRadius: 12, padding: "15px 30px", fontSize: 15, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 9,
                boxShadow: "0 8px 32px rgba(255,90,31,0.38)", transition: "all 0.25s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 40px rgba(255,90,31,0.5)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(255,90,31,0.38)"; }}>
                <Search size={16} /> Explore Now
              </a>
              <button style={{
                background: "rgba(255,255,255,0.07)", color: "#fff",
                border: "1px solid rgba(255,255,255,0.16)", borderRadius: 12,
                padding: "15px 30px", fontSize: 15, fontWeight: 500,
                display: "flex", alignItems: "center", gap: 9, cursor: "pointer",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}>
                <Phone size={15} /> Talk to Agent
              </button>
            </div>
            <div style={{ display: "flex", gap: 44 }}>
              {[{ val: "15", lbl: "Cities" }, { val: "1,200+", lbl: "Properties" }, { val: "98%", lbl: "Satisfaction" }].map(s => (
                <div key={s.lbl}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-1px", lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 4 }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "relative", height: 500 }}>
            <FloatingCard city="Barcelona" country="Spain" price="$520K" beds={3} sqm={90} emoji="🏖️" rotate={3} style={{ position: "absolute", top: 10, right: 10 }} />
            <FloatingCard city="New York" country="USA" price="$1.2M" beds={2} sqm={85} emoji="🗽" rotate={-4} style={{ position: "absolute", top: 180, left: 0 }} />
            <FloatingCard city="Dubai" country="UAE" price="$580K" beds={2} sqm={120} emoji="🌆" rotate={2} style={{ position: "absolute", bottom: 10, right: 50 }} />
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
              One platform to search, analyze, and secure your perfect property anywhere in the world.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 24 }}>
            <FeatureCard icon={<Globe size={24} />} title="Global Search"
              desc="Search across 15 major cities in Europe, Middle East, Asia and the Americas — all in one place."
              gradient="linear-gradient(135deg, #3B82F6, #2563EB)" />
            <FeatureCard icon={<SlidersHorizontal size={24} />} title="Smart Filters"
              desc="Filter by price, area, bedrooms, property type, currency and geographic radius."
              gradient="linear-gradient(135deg, #FF5A1F, #FF8C00)" />
            <FeatureCard icon={<Shield size={24} />} title="AI Value Scoring"
              desc="Every listing gets a 0–10 value score so you instantly spot underpriced gems on the market."
              gradient="linear-gradient(135deg, #0B1829, #1a3a5c)" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
            {[
              { city: "Berlin", country: "DE", type: "Apartment", price: "$420K", emoji: "🏛️" },
              { city: "Tokyo", country: "JP", type: "Studio", price: "$480K", emoji: "⛩️" },
              { city: "Lisbon", country: "PT", type: "Villa", price: "$380K", emoji: "🌊" },
              { city: "Amsterdam", country: "NL", type: "Canal House", price: "$650K", emoji: "🌷" },
            ].map(p => <PropertyCard key={p.city} {...p} />)}
          </div>
          <div style={{ textAlign: "center" }}>
            <a href="/search" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 14, fontWeight: 700, color: "#FF5A1F", textDecoration: "none", transition: "gap 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.gap = "12px")}
              onMouseLeave={e => (e.currentTarget.style.gap = "6px")}>
              View All Properties <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* 3 STEPS */}
      <section style={{
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
          <div style={{ display: "flex", gap: 20 }}>
            <StepCard num="1" icon={<Search size={20} />} title="Search" desc="Enter your city, budget, and preferences. Our engine searches 1,200+ listings instantly across 15 cities." />
            <StepCard num="2" icon={<TrendingUp size={20} />} title="Compare" desc="Compare properties side by side using AI value scores, price per m², and market position indicators." />
            <StepCard num="3" icon={<Shield size={20} />} title="Secure" desc="Connect with verified agents directly and move forward with full confidence. Your dream home awaits." />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS + CTA */}
      <section style={{ background: "linear-gradient(140deg, #060E1C 0%, #0B1829 100%)", padding: "80px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 48px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-1px", marginBottom: 12 }}>Success Stories</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.38)" }}>Real people. Real homes. Real results.</p>
          </div>
          <div style={{ display: "flex", gap: 20, marginBottom: 56 }}>
            <TestiCard initials="AK" name="Amir K." location="Berlin, Germany" quote="Found our dream apartment in Prenzlauer Berg within a week. The value score saved us from overpaying by €40,000." />
            <TestiCard initials="MS" name="Maya S." location="Dubai, UAE" quote="Relocated from London to Dubai. VeloCite made comparing neighborhoods incredibly easy. We closed in 3 weeks." />
            <TestiCard initials="YT" name="Yuki T." location="Tokyo, Japan" quote="The currency conversion and AI value scoring together are a game changer for international property hunting." />
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
                Join thousands of buyers and renters who found their perfect property with VeloCite's AI-powered search.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              <a href="/search" style={{
                background: "#fff", color: "#FF5A1F", textDecoration: "none",
                borderRadius: 12, padding: "14px 28px", fontSize: 14, fontWeight: 800,
                transition: "transform 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "scale(1.03)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = "scale(1)"}>
                Browse Properties
              </a>
              <button style={{
                background: "rgba(255,255,255,0.12)", color: "#fff",
                border: "1px solid rgba(255,255,255,0.25)", borderRadius: 12,
                padding: "14px 28px", fontSize: 14, fontWeight: 500, cursor: "pointer",
                backdropFilter: "blur(8px)",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
                Get Support
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#050D1A", padding: "52px 48px 28px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 44 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: "linear-gradient(135deg, #FF5A1F, #FF8C00)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 800, fontSize: 14,
                }}>V</div>
                <span style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>Velo<span style={{ color: "#FF5A1F" }}>Cite</span></span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.32)", lineHeight: 1.75, maxWidth: 230, marginBottom: 22 }}>
                Global real estate search powered by AI value scoring and real-time currency conversion.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {[Facebook, Twitter, Linkedin].map((Icon, i) => (
                  <div key={i} style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "rgba(255,255,255,0.38)", transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,90,31,0.2)"; el.style.color = "#FF5A1F"; el.style.borderColor = "rgba(255,90,31,0.3)"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(255,255,255,0.06)"; el.style.color = "rgba(255,255,255,0.38)"; el.style.borderColor = "rgba(255,255,255,0.08)"; }}>
                    <Icon size={14} />
                  </div>
                ))}
              </div>
            </div>
            {[
              { title: "Explore", links: ["Search Properties", "Map View", "New Listings", "Price Trends"] },
              { title: "Locations", links: ["Berlin", "Dubai", "Tokyo", "New York", "Barcelona"] },
              { title: "Company", links: ["About Us", "Blog", "Careers", "Contact"] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.22)", letterSpacing: "1.4px", textTransform: "uppercase", marginBottom: 18 }}>{col.title}</div>
                {col.links.map(link => (
                  <div key={link} style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", marginBottom: 11, cursor: "pointer", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.42)")}>{link}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>© 2026 VeloCite. All rights reserved.</span>
            <div style={{ display: "flex", gap: 24, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
              <span style={{ cursor: "pointer" }}>Privacy Policy</span>
              <span style={{ cursor: "pointer" }}>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  );
}