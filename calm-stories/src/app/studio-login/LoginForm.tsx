"use client";

import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-6 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        const res = await fetch("/api/studio-login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw, next }) });
        const data = (await res.json().catch(() => ({}))) as { next?: string; error?: string };
        if (res.ok) window.location.href = data.next ?? "/studio";
        else {
          setErr(data.error ?? "Couldn't sign in.");
          setBusy(false);
        }
      }}
    >
      <input type="password" autoFocus required className="input w-full" placeholder="Passcode" inputMode="numeric" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Passcode" />
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Checking…" : "Enter the studio"}</button>
      {err && <p role="alert" className="text-sm text-rose-300">{err}</p>}
    </form>
  );
}
