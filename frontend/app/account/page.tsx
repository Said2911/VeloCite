"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/api";
import { CURRENCIES } from "@/lib/format";

function AccountForm({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [currency, setCurrency] = useState(user.preferred_currency || "AZN");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await updateUser({ full_name: fullName.trim() || undefined, preferred_currency: currency });
      setStatus({ ok: true, text: "Saved." });
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : "Could not save" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="vc-panel" style={{ display: "grid", gap: 16 }}>
      <label>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>E-mail</span>
        <input className="vc-input" value={user.email} disabled style={{ marginTop: 6, background: "#F9FAFB", color: "#6B7280" }} />
      </label>
      <label>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Full name</span>
        <input className="vc-input" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100} style={{ marginTop: 6 }} />
      </label>
      <label>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Default currency for prices</span>
        <select className="vc-input" value={currency} onChange={e => setCurrency(e.target.value)} style={{ marginTop: 6 }}>
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button type="submit" className="vc-btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        {status && <span style={{ fontSize: 13, color: status.ok ? "#16A34A" : "#DC2626" }}>{status.text}</span>}
      </div>
    </form>
  );
}

export default function AccountPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login?next=/account");
  }, [ready, user, router]);

  return (
    <div style={{ fontFamily: "'Inter', 'Geist', sans-serif", background: "#F8F9FB", minHeight: "100vh" }}>
      <Navbar />
      <div className="vc-pad" style={{ maxWidth: 560, margin: "0 auto", padding: "40px 48px 64px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0B1829", letterSpacing: "-0.8px", marginBottom: 24 }}>Account settings</h1>
        {user ? <AccountForm key={user.id} user={user} /> : <div className="vc-skeleton" style={{ height: 300 }} />}
      </div>
    </div>
  );
}
