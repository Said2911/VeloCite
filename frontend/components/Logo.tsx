import Link from "next/link";

export default function Logo({ size = 34, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.26,
        background: "linear-gradient(135deg, #FF5A1F 0%, #FF8C00 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 800, fontSize: size * 0.47,
        boxShadow: "0 4px 16px rgba(255,90,31,0.4)",
      }}>V</div>
      <span style={{ fontWeight: 700, fontSize: size * 0.53, color: dark ? "#0B1829" : "#fff", letterSpacing: "-0.4px" }}>
        Velo<span style={{ color: "#FF5A1F" }}>Cite</span>
      </span>
    </Link>
  );
}
