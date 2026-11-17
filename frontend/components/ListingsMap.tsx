"use client";

// Interactive map of listings using Leaflet + OpenStreetMap tiles.
// Leaflet is loaded from a CDN at runtime, so no npm dependency or API key
// (Mapbox token) is needed.

import { useEffect, useRef, useState } from "react";
import type { Listing } from "@/lib/api";
import { formatPrice, scoreColor } from "@/lib/format";

const LEAFLET_VERSION = "1.9.4";
const LEAFLET_JS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
const LEAFLET_CSS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;

// Minimal typing for the parts of the Leaflet API we use
interface LeafletLayer { addTo(map: LeafletMap): LeafletLayer; bindPopup(html: string): LeafletLayer; remove(): void }
interface LeafletMap {
  setView(center: [number, number], zoom: number): LeafletMap;
  fitBounds(bounds: [number, number][], options?: { padding: [number, number]; maxZoom?: number }): void;
  remove(): void;
}
interface LeafletGlobal {
  map(el: HTMLElement, options?: { scrollWheelZoom?: boolean }): LeafletMap;
  tileLayer(url: string, options: { attribution: string; maxZoom: number }): LeafletLayer;
  circleMarker(
    latlng: [number, number],
    options: { radius: number; color: string; fillColor: string; fillOpacity: number; weight: number },
  ): LeafletLayer;
}

let leafletPromise: Promise<LeafletGlobal> | null = null;

function loadLeaflet(): Promise<LeafletGlobal> {
  const w = window as unknown as { L?: LeafletGlobal };
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => (w.L ? resolve(w.L) : reject(new Error("Leaflet failed to initialise")));
    script.onerror = () => {
      leafletPromise = null;
      reject(new Error("Could not load the map library"));
    };
    document.body.appendChild(script);
  });
  return leafletPromise;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export default function ListingsMap({ listings, height = 520, zoom = 12 }: {
  listings: Listing[]; height?: number; zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let map: LeafletMap | null = null;
    let cancelled = false;
    const points = listings.filter(l => l.lat != null && l.lng != null);

    loadLeaflet()
      .then(L => {
        if (cancelled || !containerRef.current || points.length === 0) return;
        map = L.map(containerRef.current, { scrollWheelZoom: false });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        for (const l of points) {
          const color = scoreColor(l.value_score);
          const title = escapeHtml(`${l.property_type} · ${l.district || l.city}`);
          const price = escapeHtml(formatPrice(l.price_display, l.currency, l.listing_type));
          L.circleMarker([l.lat!, l.lng!], { radius: 8, color: "#fff", fillColor: color, fillOpacity: 0.95, weight: 2 })
            .addTo(map)
            .bindPopup(
              `<div style="font-family:inherit;min-width:160px">
                 <div style="font-size:11px;color:#FF5A1F;font-weight:700;text-transform:uppercase">${title}</div>
                 <div style="font-size:15px;font-weight:800;margin:4px 0">${price}</div>
                 <div style="font-size:12px;color:#6B7280;margin-bottom:6px">Value score: ${l.value_score?.toFixed(1) ?? "—"}</div>
                 <a href="/listings/${encodeURIComponent(l.id)}?currency=${encodeURIComponent(l.currency)}" style="color:#FF5A1F;font-weight:700">View details →</a>
               </div>`,
            );
        }

        if (points.length === 1) map.setView([points[0].lat!, points[0].lng!], zoom);
        else map.fitBounds(points.map(p => [p.lat!, p.lng!] as [number, number]), { padding: [30, 30], maxZoom: 14 });
      })
      .catch(e => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [listings, zoom]);

  if (error) {
    return <div className="vc-panel" style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}>{error}</div>;
  }
  if (!listings.some(l => l.lat != null && l.lng != null)) {
    return <div className="vc-panel" style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}>No coordinates to show on the map.</div>;
  }
  return <div ref={containerRef} style={{ height, borderRadius: 18, overflow: "hidden", border: "1px solid #F0F2F5", zIndex: 0, position: "relative" }} />;
}
