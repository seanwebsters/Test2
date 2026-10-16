"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Network Executive decision on a series greenlight. */
export function GateDecision({ runId, stepKey, approveLabel = "Greenlight", rejectLabel = "Pass" }: { runId: string; stepKey: string; approveLabel?: string; rejectLabel?: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const decide = async (approved: boolean) => {
    if (!approved && !confirm("Pass on this series? Development will stop.")) return;
    setBusy(true);
    const res = await fetch("/api/studio/gates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ run_id: runId, step_key: stepKey, approved, notes }) });
    setBusy(false);
    if (!res.ok) return setErr(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't record the decision.");
    router.refresh();
  };
  return (
    <div className="space-y-3">
      <textarea rows={3} className="input" placeholder="Notes for the team (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={busy} onClick={() => decide(true)}>{approveLabel}</button>
        <button className="btn-ghost" disabled={busy} onClick={() => decide(false)}>{rejectLabel}</button>
      </div>
      {err && <p role="alert" className="text-sm text-rose-300">{err}</p>}
    </div>
  );
}
