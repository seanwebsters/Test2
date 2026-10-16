"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLE =
  "Create a premium adult romantasy series about a mysterious enchanted sleeper train travelling between magical kingdoms. Slow-burn romance, luxurious atmosphere, original characters and deeply calming bedtime storytelling.";

export function BriefForm({ proposals = [] }: { proposals?: { title: string; brief: string }[] }) {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/studio/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ brief }) });
    const data = (await res.json().catch(() => ({}))) as { project_id?: string; error?: string };
    setBusy(false);
    if (!res.ok || !data.project_id) return setError(data.error ?? "Couldn't start development.");
    router.push(`/studio/projects/${data.project_id}`);
  };
  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <label className="block">
        <span className="label">Your brief</span>
        <textarea required minLength={20} rows={7} className="input text-base leading-relaxed" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={EXAMPLE} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={busy || brief.trim().length < 20}>{busy ? "Briefing the team…" : "Start development"}</button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setBrief(EXAMPLE)}>Use the sleeper-train example</button>
        {proposals.map((p) => (
          <button key={p.title} type="button" className="btn-ghost btn-sm" onClick={() => setBrief(p.brief)}>Use “{p.title}”</button>
        ))}
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      </div>
    </form>
  );
}
