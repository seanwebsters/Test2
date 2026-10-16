"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductionWorkflow } from "@/lib/types";
import { cx } from "@/lib/util";

type Fields = Pick<ProductionWorkflow, "status" | "episodes_per_week" | "release_days" | "release_hour_utc" | "target_minutes" | "voice_id" | "art_style" | "story_notes" | "budget_cents">;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WorkflowForm({ seriesId, initial }: { seriesId: string; initial: Fields }) {
  const router = useRouter();
  const [f, setF] = useState<Fields>({
    status: initial.status,
    episodes_per_week: initial.episodes_per_week,
    release_days: initial.release_days,
    release_hour_utc: initial.release_hour_utc,
    target_minutes: initial.target_minutes,
    voice_id: initial.voice_id,
    art_style: initial.art_style,
    story_notes: initial.story_notes,
    budget_cents: initial.budget_cents,
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/admin/workflows/${seriesId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: data.error ?? "Couldn't save." });
    if (res.ok) router.refresh();
  };
  const toggleDay = (d: number) => setF({ ...f, release_days: f.release_days.includes(d) ? f.release_days.filter((x) => x !== d) : [...f.release_days, d].sort() });
  return (
    <form onSubmit={save} className="card mt-4 space-y-4 p-5 text-sm">
      <label className="flex items-center gap-2">
        <input type="checkbox" className="accent-lavender" checked={f.status === "active"} onChange={(e) => setF({ ...f, status: e.target.checked ? "active" : "paused" })} />
        <span className="font-medium">Schedule active</span>
        <span className="text-mist">– agents produce episodes automatically</span>
      </label>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs text-mist">Episodes / week<input type="number" min={1} max={7} className="input mt-1" value={f.episodes_per_week} onChange={(e) => setF({ ...f, episodes_per_week: Number(e.target.value) })} /></label>
        <label className="text-xs text-mist">Release hour (UTC)<input type="number" min={0} max={23} className="input mt-1" value={f.release_hour_utc} onChange={(e) => setF({ ...f, release_hour_utc: Number(e.target.value) })} /></label>
        <label className="text-xs text-mist">Length (minutes)<input type="number" min={1} max={60} className="input mt-1" value={f.target_minutes} onChange={(e) => setF({ ...f, target_minutes: Number(e.target.value) })} /></label>
        <label className="text-xs text-mist">Budget / episode (¢)<input type="number" min={0} className="input mt-1" value={f.budget_cents} onChange={(e) => setF({ ...f, budget_cents: Number(e.target.value) })} /></label>
      </div>
      <fieldset>
        <legend className="text-xs text-mist">Release days</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {DAYS.map((d, i) => (
            <button type="button" key={d} onClick={() => toggleDay(i)} aria-pressed={f.release_days.includes(i)} className={cx("rounded-full px-3 py-1 text-xs", f.release_days.includes(i) ? "bg-white text-night" : "bg-white/5 text-mist")}>
              {d}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block text-xs text-mist">
        ElevenLabs voice ID <span className="text-mist/70">(blank = default from Agent settings)</span>
        <input className="input mt-1" value={f.voice_id ?? ""} onChange={(e) => setF({ ...f, voice_id: e.target.value || null })} placeholder="e.g. JBFqnCBsd6RMkjVDRZzb" />
      </label>
      <label className="block text-xs text-mist">
        Art style for Nano Banana
        <input className="input mt-1" value={f.art_style} onChange={(e) => setF({ ...f, art_style: e.target.value })} placeholder="Painterly moonlit fairytale, deep indigo and silver, no text" />
      </label>
      <label className="block text-xs text-mist">
        Showrunner notes – tone, recurring characters, where the story is heading
        <textarea rows={5} className="input mt-1" value={f.story_notes} onChange={(e) => setF({ ...f, story_notes: e.target.value })} />
      </label>
      <div className="flex items-center gap-3">
        <button className="btn-primary btn-sm">Save</button>
        {msg && <span role="status" className={msg.ok ? "text-emerald-200" : "text-rose-300"}>{msg.text}</span>}
      </div>
    </form>
  );
}
