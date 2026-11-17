"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/auth";

/** Heart toggle. Logged-out users are sent to the login page. */
export default function FavoriteButton({ listingId, size = 34, withLabel = false }: {
  listingId: string; size?: number; withLabel?: boolean;
}) {
  const { user, favoriteIds, toggleFavorite } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const active = favoriteIds.has(listingId);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();      // cards are links — don't navigate
    e.stopPropagation();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setBusy(true);
    try {
      await toggleFavorite(listingId);
    } catch {
      /* state already rolled back */
    } finally {
      setBusy(false);
    }
  };

  if (withLabel) {
    return (
      <button onClick={onClick} disabled={busy} className="vc-btn-outline" aria-pressed={active}
        style={active ? { borderColor: "#FF5A1F", color: "#FF5A1F" } : undefined}>
        <Heart size={15} fill={active ? "#FF5A1F" : "none"} />
        {active ? "Saved" : "Save listing"}
      </button>
    );
  }

  return (
    <button onClick={onClick} disabled={busy} aria-pressed={active}
      aria-label={active ? "Remove from saved" : "Save listing"} title={active ? "Remove from saved" : "Save listing"}
      style={{
        width: size, height: size, borderRadius: "50%", border: "none", cursor: "pointer",
        background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)", transition: "transform 0.15s",
      }}>
      <Heart size={size * 0.47} color={active ? "#FF5A1F" : "#6B7280"} fill={active ? "#FF5A1F" : "none"} />
    </button>
  );
}
