"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Heart, LogOut, Search, User as UserIcon } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth";

const LINKS: [string, string][] = [
  ["Explore", "/search"],
  ["Locations", "/#locations"],
  ["How it works", "/#how-it-works"],
];

/** `overlay` = fixed and transparent over a hero (home page); `solid` = sticky dark bar. */
export default function Navbar({ variant = "solid" }: { variant?: "overlay" | "solid" }) {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "overlay") return;
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const overlay = variant === "overlay";
  const initials = (user?.full_name || user?.email || "?")
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(s => s[0]!.toUpperCase()).join("");

  return (
    <nav className="vc-pad" style={{
      position: overlay ? "fixed" : "sticky", top: 0, left: 0, right: 0, zIndex: 200,
      background: overlay ? (scrolled ? "rgba(5,13,26,0.92)" : "rgba(5,13,26,0.35)") : "#0B1829",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderBottom: `1px solid ${overlay && !scrolled ? "transparent" : "rgba(255,255,255,0.08)"}`,
      boxShadow: overlay ? "none" : "0 2px 24px rgba(0,0,0,0.35)",
      transition: "all 0.35s ease", padding: "0 48px", height: 64,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <Logo />

      <div className="vc-hide-mobile" style={{ display: "flex", gap: 32 }}>
        {LINKS.map(([label, href]) => (
          <Link key={label} href={href} className={`vc-navlink${pathname === href ? " active" : ""}`}>{label}</Link>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 180, justifyContent: "flex-end" }}>
        {!ready ? null : user ? (
          <>
            <Link href="/favorites" className="vc-btn-ghost" title="Saved listings">
              <Heart size={14} /> <span className="vc-hide-mobile">Saved</span>
            </Link>
            <div ref={menuRef} style={{ position: "relative" }}>
              <button onClick={() => setMenuOpen(o => !o)} aria-label="Account menu" style={{
                width: 38, height: 38, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)",
                background: "linear-gradient(135deg, #FF5A1F, #FF8C00)", color: "#fff",
                fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}>{initials}</button>
              {menuOpen && (
                <div style={{
                  position: "absolute", right: 0, top: 46, width: 240, background: "#fff",
                  borderRadius: 14, boxShadow: "0 16px 48px rgba(11,24,41,0.25)", overflow: "hidden",
                }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #F0F2F5" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0B1829" }}>{user.full_name || "My account"}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
                  </div>
                  {[
                    { href: "/favorites", icon: <Heart size={14} />, label: "Saved listings" },
                    { href: "/account", icon: <UserIcon size={14} />, label: "Account settings" },
                    { href: "/search", icon: <Search size={14} />, label: "Search" },
                  ].map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
                      display: "flex", gap: 10, alignItems: "center", padding: "11px 16px",
                      fontSize: 13, color: "#374151", textDecoration: "none",
                    }}>{item.icon}{item.label}</Link>
                  ))}
                  <button onClick={() => { logout(); setMenuOpen(false); router.push("/"); }} style={{
                    display: "flex", gap: 10, alignItems: "center", padding: "11px 16px", width: "100%",
                    fontSize: 13, color: "#DC2626", background: "none", border: "none",
                    borderTop: "1px solid #F0F2F5", cursor: "pointer", fontFamily: "inherit",
                  }}><LogOut size={14} /> Log out</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link href={`/login?next=${encodeURIComponent(pathname || "/")}`} className="vc-btn-ghost">Sign In</Link>
            <Link href="/search" className="vc-btn-primary vc-hide-mobile" style={{ padding: "8px 20px", fontSize: 13 }}>
              Explore Now
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
