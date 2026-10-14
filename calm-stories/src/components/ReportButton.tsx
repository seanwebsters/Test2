"use client";

import { useState } from "react";

const REASONS = [
  { value: "not_sleep_friendly", label: "Not sleep-friendly" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "copyright", label: "Copyright or rights concern" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Something else" },
];

/** Opens a small form that files a content report for editorial review. */
export function ReportButton({ targetType, targetId, signedIn }: { targetType: "series" | "episode" | "creator"; targetId: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("not_sleep_friendly");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  if (state === "sent") return <p className="text-xs text-mist">Thanks — your report was sent to the Calm editorial team.</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-mist underline-offset-4 hover:text-white hover:underline">
        Report this {targetType}
      </button>
    );
  return (
    <form
      className="card-surface space-y-3 p-4 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        const res = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetType, targetId, reason, details }) });
        setState(res.ok ? "sent" : "error");
      }}
    >
      <p className="font-medium">Report this {targetType}</p>
      <label className="block">
        <span className="text-xs text-mist">Reason</span>
        <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-night-2 px-3 py-2">
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-mist">Details (optional)</span>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-night-2 px-3 py-2" />
      </label>
      {!signedIn && <p className="text-xs text-mist">You can report without signing in. Copyright complaints may need contact details; see the rights policy.</p>}
      {state === "error" && <p className="text-xs text-red-300">Could not send the report. Please try again.</p>}
      <div className="flex gap-2">
        <button disabled={state === "sending"} className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-night">
          Send report
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-xs text-mist">
          Cancel
        </button>
      </div>
    </form>
  );
}
