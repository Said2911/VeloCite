"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import ListingCard, { ListingGridSkeleton } from "@/components/ListingCard";
import Navbar from "@/components/Navbar";
import { getFavorites, type Listing } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function FavoritesPage() {
  const { user, ready, favoriteIds } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<{ listings: Listing[]; error: string | null } | null>(null);
  const currency = user?.preferred_currency ?? "AZN";

  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/favorites");
  }, [ready, user, router]);

  // Load once per user/currency; un-saving afterwards just hides the card
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getFavorites(currency)
      .then(listings => { if (!cancelled) setResult({ listings, error: null }); })
      .catch(e => { if (!cancelled) setResult({ listings: [], error: e.message }); });
    return () => { cancelled = true; };
  }, [user, currency]);

  const visible = (result?.listings ?? []).filter(l => favoriteIds.has(l.id));

  return (
    <div style={{ fontFamily: "'Inter', 'Geist', sans-serif", background: "#F8F9FB", minHeight: "100vh" }}>
      <Navbar />
      <div className="vc-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 48px 64px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0B1829", letterSpacing: "-0.8px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
          <Heart size={22} color="#FF5A1F" fill="#FF5A1F" /> Saved listings
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 28 }}>
          Prices shown in {currency}. Change your default currency in <Link href="/account" style={{ color: "#FF5A1F" }}>account settings</Link>.
        </p>

        {result?.error && <div style={{ background: "#FEF2F2", color: "#DC2626", borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>{result.error}</div>}

        {!result ? <ListingGridSkeleton count={3} /> : visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: "70px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🤍</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0B1829", marginBottom: 8 }}>Nothing saved yet</h2>
            <p style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 24 }}>Tap the heart on any listing to keep it here.</p>
            <Link href="/search" className="vc-btn-primary">Browse properties</Link>
          </div>
        ) : (
          <div className="vc-grid">
            {visible.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
      </div>
    </div>
  );
}
