"use client";

import { useEffect, useState } from "react";

/** Banner shown while an API request is unusually slow (sleeping free-tier server). */
export default function WakeNotice() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const onSlow = (e: Event) => setSlow(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("velocite:slow", onSlow);
    return () => window.removeEventListener("velocite:slow", onSlow);
  }, []);

  if (!slow) return null;
  return (
    <div role="status" style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 500,
      background: "#0B1829", color: "#fff", borderRadius: 14, padding: "14px 20px", maxWidth: 520,
      boxShadow: "0 16px 48px rgba(0,0,0,0.35)", display: "flex", gap: 12, alignItems: "center", fontSize: 13,
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.25)",
        borderTopColor: "#FF5A1F", animation: "vc-spin 0.9s linear infinite", flexShrink: 0,
      }} />
      <span>
        <b>Waking up the server…</b> The free hosting sleeps when nobody visits,
        so the first request can take up to a minute.
      </span>
      <style>{`@keyframes vc-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
