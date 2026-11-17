export default function Pagination({ page, totalPages, onChange }: {
  page: number; totalPages: number; onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 2) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 48, flexWrap: "wrap" }}>
      <button className="vc-btn-outline" disabled={page === 1} onClick={() => onChange(page - 1)}>← Prev</button>
      {pages.map((p, i) => p === "…" ? (
        <span key={`gap-${i}`} style={{ color: "#D1D5DB", fontSize: 13 }}>…</span>
      ) : (
        <button key={p} onClick={() => onChange(p)} aria-current={p === page ? "page" : undefined} style={{
          width: 40, height: 40, borderRadius: 10, fontFamily: "inherit",
          border: p === page ? "none" : "1px solid #E5E7EB",
          background: p === page ? "#FF5A1F" : "#fff", color: p === page ? "#fff" : "#0B1829",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          boxShadow: p === page ? "0 4px 12px rgba(255,90,31,0.3)" : "none",
        }}>{p}</button>
      ))}
      <button className="vc-btn-outline" disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next →</button>
    </div>
  );
}
