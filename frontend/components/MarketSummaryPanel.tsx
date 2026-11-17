import { BarChart3 } from "lucide-react";
import type { MarketSummary } from "@/lib/api";
import { formatMoney } from "@/lib/format";

/** Price-per-m² distribution (p10–p90) plus median by bedroom count. */
export default function MarketSummaryPanel({ summary, title = "Market snapshot", rent = false }: {
  summary: MarketSummary; title?: string; rent?: boolean;
}) {
  const d = summary.price_distribution;
  const min = d.p10 ?? 0;
  const max = d.p90 ?? 1;
  const span = Math.max(max - min, 1);
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - min) / span) * 100))}%`;
  const unit = rent ? "/m²/mo" : "/m²";
  const bedrooms = Object.entries(summary.bedroom_breakdown).sort((a, b) => Number(a[0]) - Number(b[0]));
  const maxBedroom = Math.max(...bedrooms.map(([, v]) => v), 1);

  return (
    <div className="vc-panel">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <BarChart3 size={16} color="#FF5A1F" />
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0B1829" }}>{title}</h3>
        <span style={{ fontSize: 12, color: "#9CA3AF", marginLeft: "auto" }}>{summary.listings_analyzed} listings analysed</span>
      </div>

      <div style={{ display: "flex", gap: 28, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>Median price</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0B1829" }}>{formatMoney(summary.median_price_sqm, summary.currency)}<span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>{unit}</span></div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>Average price</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0B1829" }}>{formatMoney(summary.avg_price_sqm, summary.currency)}<span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>{unit}</span></div>
        </div>
      </div>

      {/* p10 – p90 range bar */}
      <div style={{ position: "relative", height: 10, borderRadius: 6, background: "linear-gradient(90deg, #22C55E, #F59E0B, #EF4444)", marginBottom: 8 }}>
        {d.p25 != null && d.p75 != null && (
          <div style={{ position: "absolute", left: pos(d.p25), width: `calc(${pos(d.p75)} - ${pos(d.p25)})`, top: -3, bottom: -3, border: "2px solid #0B1829", borderRadius: 6 }} />
        )}
        {d.p50 != null && <div style={{ position: "absolute", left: pos(d.p50), top: -6, bottom: -6, width: 3, background: "#0B1829", borderRadius: 2, transform: "translateX(-50%)" }} />}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280", marginBottom: 18 }}>
        <span>10%: {formatMoney(d.p10, summary.currency)}</span>
        <span>median: {formatMoney(d.p50, summary.currency)}</span>
        <span>90%: {formatMoney(d.p90, summary.currency)}</span>
      </div>

      {bedrooms.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Median {unit} by bedrooms</div>
          {bedrooms.map(([beds, value]) => (
            <div key={beds} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, fontSize: 12 }}>
              <span style={{ width: 52, color: "#6B7280" }}>{beds === "0" ? "Studio" : `${beds} bd`}</span>
              <div style={{ flex: 1, background: "#F3F4F6", borderRadius: 4, height: 8 }}>
                <div style={{ width: `${(value / maxBedroom) * 100}%`, background: "#FF5A1F", height: 8, borderRadius: 4 }} />
              </div>
              <span style={{ width: 80, textAlign: "right", color: "#0B1829", fontWeight: 600 }}>{formatMoney(value, summary.currency)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
