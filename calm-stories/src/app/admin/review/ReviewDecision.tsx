"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function toLocalInput(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 86400000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReviewDecision({ reviewId, requested, hasAudio }: { reviewId: string; requested: string | null; hasAudio: boolean }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [when, setWhen] = useState(toLocalInput(requested));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const decide = async (decision: "approve" | "reject" | "changes_requested") => {
    if (decision !== "approve" && !notes.trim()) {
      setError("Add a note explaining what needs to change.");
      return;
    }
    setBusy(decision);
    setError(null);
    const res = await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, notes: notes || undefined, release_at: decision === "approve" ? new Date(when).toISOString() : undefined }),
    });
    setBusy(null);
    if (!res.ok) setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Failed");
    else router.refresh();
  };
  return (
    <section className="card space-y-3 p-5" aria-labelledby="decision-h">
      <h3 id="decision-h" className="font-medium">Decision</h3>
      <label className="block text-xs text-mist">Release at (your local time)
        <input type="datetime-local" className="input mt-1" value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>
      <label className="block text-xs text-mist">Notes
        <textarea rows={3} className="input mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Required for rejections and change requests (internal note)" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="btn-accent btn-sm" disabled={busy !== null || !hasAudio} onClick={() => decide("approve")}>{busy === "approve" ? "Approving…" : "Approve & schedule"}</button>
        <button className="btn-ghost btn-sm" disabled={busy !== null} onClick={() => decide("changes_requested")}>Request changes</button>
        <button className="btn-danger btn-sm" disabled={busy !== null} onClick={() => decide("reject")}>Reject</button>
      </div>
      {!hasAudio && <p className="text-xs text-amber-200">Audio is required before approval.</p>}
      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
      <p className="text-[11px] text-mist">Approved episodes go live automatically at the release time – not before.</p>
    </section>
  );
}
