"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const toLocal = (iso: string | null) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 86400000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Change an approved episode's release time (or release it in a minute). */
export function ReleaseTime({ episodeId, releaseAt }: { episodeId: string; releaseAt: string | null }) {
  const router = useRouter();
  const [when, setWhen] = useState(toLocal(releaseAt));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async (iso: string) => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ episode_id: episodeId, release_at: iso }) });
    setBusy(false);
    if (res.ok) {
      setMsg("Saved.");
      router.refresh();
    } else setMsg(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save.");
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="datetime-local" className="input text-sm" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Release time" />
      <button className="btn-primary btn-sm" disabled={busy} onClick={() => save(new Date(when).toISOString())}>Save time</button>
      <button className="btn-ghost btn-sm" disabled={busy} onClick={() => save(new Date(Date.now() + 60_000).toISOString())}>Release now</button>
      {msg && <span role="status" className="text-xs text-mist">{msg}</span>}
    </div>
  );
}
