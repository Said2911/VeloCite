"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth";

function safeNext(next: string | null): string {
  // only allow same-site relative paths
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/search";
}

function LoginInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(searchParams.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = safeNext(searchParams.get("next"));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "register" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, fullName);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      background: "linear-gradient(140deg, #050D1A 0%, #0B1829 45%, #0D2040 100%)", fontFamily: "'Inter', 'Geist', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}><Logo size={40} /></div>
        <form onSubmit={submit} style={{ background: "#fff", borderRadius: 22, padding: "32px 30px", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
          <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {(["login", "register"] as const).map(m => (
              <button type="button" key={m} onClick={() => { setMode(m); setError(null); }} style={{
                flex: 1, padding: "9px 0", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: 700, background: mode === m ? "#fff" : "transparent",
                color: mode === m ? "#0B1829" : "#6B7280", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}>{m === "login" ? "Sign in" : "Create account"}</button>
            ))}
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0B1829", marginBottom: 6 }}>
            {mode === "login" ? "Welcome back" : "Join VeloCite"}
          </h1>
          <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 22 }}>
            {mode === "login" ? "Sign in to see your saved listings." : "Save listings and pick your default currency."}
          </p>

          {mode === "register" && (
            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Full name (optional)</span>
              <input className="vc-input" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" style={{ marginTop: 6 }} />
            </label>
          )}
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>E-mail</span>
            <input className="vc-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" style={{ marginTop: 6 }} />
          </label>
          <label style={{ display: "block", marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Password{mode === "register" ? " (min. 8 characters)" : ""}</span>
            <input className="vc-input" type="password" required minLength={mode === "register" ? 8 : undefined} value={password}
              onChange={e => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} style={{ marginTop: 6 }} />
          </label>

          {error && <div role="alert" style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, borderRadius: 10, padding: "10px 12px", marginBottom: 16 }}>{error}</div>}

          <button type="submit" className="vc-btn-primary" disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "13px 0" }}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13 }}>
          <Link href="/search" style={{ color: "rgba(255,255,255,0.6)" }}>Continue without an account →</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
