"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductionWorkflow } from "@/lib/types";
import { cx } from "@/lib/util";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WorkflowForm({ seriesId, initial, voices, soundscapes }: { seriesId: string; initial: ProductionWorkflow | null; voices: { id: string; name: string }[]; soundscapes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState({
    episodes_per_week: initial?.episodes_per_week ?? 3,
    target_duration_minutes: initial?.target_duration_minutes ?? 30,
    writing_provider: initial?.writing_provider ?? "auto",
    writing_model: initial?.writing_model ?? "claude-opus-5-5",
    narrator_voice_id: initial?.narrator_voice_id ?? voices[0]?.id ?? null,
    soundscape_id: initial?.soundscape_id ?? soundscapes[0]?.id ?? null,
    release_days: initial?.release_days ?? [1, 3, 5],
    release_hour_utc: initial?.release_hour_utc ?? 20,
    max_budget_cents: initial?.max_budget_cents ?? 2500,
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    const res = await fetch(`/api/admin/workflows/${seriesId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setState(res.ok ? "saved" : body.error ?? "Failed");
    router.refresh();
  };
  const toggleDay = (d: number) => setF({ ...f, release_days: f.release_days.includes(d) ? f.release_days.filter((x) => x !== d) : [...f.release_days, d].sort() });
  return (
    <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-xs text-mist">Episodes per week<input type="number" min={1} max={7} className="input mt-1" value={f.episodes_per_week} onChange={(e) => setF({ ...f, episodes_per_week: Number(e.target.value) })} /></label>
      <label className="text-xs text-mist">Target duration (minutes)<input type="number" min={10} max={90} className="input mt-1" value={f.target_duration_minutes} onChange={(e) => setF({ ...f, target_duration_minutes: Number(e.target.value) })} /></label>
      <label className="text-xs text-mist">Writing provider
        <select className="input mt-1" value={f.writing_provider} onChange={(e) => setF({ ...f, writing_provider: e.target.value as typeof f.writing_provider })}>
          <option value="auto">Auto (configured provider)</option><option value="anthropic">Anthropic</option><option value="openai">OpenAI</option><option value="mock">Simulator</option>
        </select>
      </label>
      <label className="text-xs text-mist">Preferred model<input className="input mt-1" value={f.writing_model} onChange={(e) => setF({ ...f, writing_model: e.target.value })} /></label>
      <label className="text-xs text-mist">Narrator
        <select className="input mt-1" value={f.narrator_voice_id ?? ""} onChange={(e) => setF({ ...f, narrator_voice_id: e.target.value })}>{voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
      </label>
      <label className="text-xs text-mist">Soundscape
        <select className="input mt-1" value={f.soundscape_id ?? ""} onChange={(e) => setF({ ...f, soundscape_id: e.target.value })}>{soundscapes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="text-xs text-mist">Release days</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {DAYS.map((d, i) => (
            <button type="button" key={d} aria-pressed={f.release_days.includes(i)} onClick={() => toggleDay(i)} className={cx("rounded-full border px-3 py-1 text-sm", f.release_days.includes(i) ? "border-lavender bg-lavender/15 text-white" : "border-white/10 text-mist")}>{d}</button>
          ))}
        </div>
      </fieldset>
      <label className="text-xs text-mist">Release hour (UTC)<input type="number" min={0} max={23} className="input mt-1" value={f.release_hour_utc} onChange={(e) => setF({ ...f, release_hour_utc: Number(e.target.value) })} /></label>
      <label className="text-xs text-mist">Max budget per episode (cents)<input type="number" min={0} className="input mt-1" value={f.max_budget_cents} onChange={(e) => setF({ ...f, max_budget_cents: Number(e.target.value) })} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked readOnly disabled className="accent-lavender" /> Editorial approval required before release (always on)</label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" type="submit" disabled={state === "saving"}>{initial ? "Save workflow" : "Create workflow"}</button>
        <span className="text-sm text-mist" role="status">{state === "saved" ? "Saved." : state === "saving" || state === "idle" ? "" : state}</span>
      </div>
    </form>
  );
}
