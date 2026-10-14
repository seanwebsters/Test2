"use client";

import { useState } from "react";
import { Icon } from "./Icon";

const REASONS = [
  { value: "copyright", label: "Copyright or rights concern" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "not_sleep_friendly", label: "Not sleep-friendly (distressing, loud)" },
  { value: "impersonation", label: "Impersonation / unauthorised voice" },
  { value: "other", label: "Something else" },
] as const;

export function ReportButton({ targetType, targetId }: { targetType: "series" | "episode" | "creator"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("copyright");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, details }),
    });
    setState(res.ok ? "sent" : "error");
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs text-mist hover:text-white">
        <Icon name="flag" size={14} /> Report
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <form onSubmit={submit} className="card w-full max-w-md p-6">
            <h2 id="report-title" className="headline text-2xl">Report this {targetType}</h2>
            {state === "sent" ? (
              <>
                <p className="mt-3 text-sm text-mist">Thank you. Our editorial team reviews every report. Copyright complaints are handled under our content removal process.</p>
                <button type="button" onClick={() => setOpen(false)} className="btn-primary mt-5">Close</button>
              </>
            ) : (
              <>
                <fieldset className="mt-4 space-y-2">
                  <legend className="label">Reason</legend>
                  {REASONS.map((r) => (
                    <label key={r.value} className="flex items-center gap-2 text-sm">
                      <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-lavender" />
                      {r.label}
                    </label>
                  ))}
                </fieldset>
                <label className="label mt-4" htmlFor="report-details">Details</label>
                <textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={4} maxLength={2000} className="input" placeholder="Tell us what's wrong (for copyright, include the original work and your relationship to it)." />
                {state === "error" && <p role="alert" className="mt-2 text-sm text-rose-300">Couldn&rsquo;t send the report. Please try again.</p>}
                <div className="mt-5 flex gap-3">
                  <button type="submit" disabled={state === "sending"} className="btn-primary">{state === "sending" ? "Sending…" : "Send report"}</button>
                  <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
