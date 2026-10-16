"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cx } from "@/lib/util";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type F = { status: "active" | "paused"; episodes_per_week: number; release_days: number[]; release_hour_utc: number; target_minutes: number; budget_cents: number };

export function ScheduleForm({ seriesId, initial }: { seriesId: string; initial: F }) {
  const router = useRouter();
  const [f, setF] = useState<F>({ status: initial.status, episodes_per_week: initial.episodes_per_week, release_days: initial.release_days, release_hour_utc: initial.release_hour_utc, target_minutes: initial.target_minutes, budget_cents: initial.budget_cents });
  const [msg, setMsg] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/studio/schedules/${seriesId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    setMsg(res.ok ? "Saved." : (((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save."));
    if (res.ok) router.refresh();
  };
  return (
    <form onSubmit={save} className="mt-3 space-y-3 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" className="accent-lavender" checked={f.status === "active"} onChange={(e) => setF({ ...f, status: e.target.checked ? "active" : "paused" })} /> Schedule active</label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs text-mist">Per week<input type="number" min={1} max={7} className="input mt-1" value={f.episodes_per_week} onChange={(e) => setF({ ...f, episodes_per_week: Number(e.target.value) })} /></label>
        <label className="text-xs text-mist">Hour (UTC)<input type="number" min={0} max={23} className="input mt-1" value={f.release_hour_utc} onChange={(e) => setF({ ...f, release_hour_utc: Number(e.target.value) })} /></label>
        <label className="text-xs text-mist">Minutes<input type="number" min={5} max={90} className="input mt-1" value={f.target_minutes} onChange={(e) => setF({ ...f, target_minutes: Number(e.target.value) })} /></label>
        <label className="text-xs text-mist">Budget (¢)<input type="number" min={0} className="input mt-1" value={f.budget_cents} onChange={(e) => setF({ ...f, budget_cents: Number(e.target.value) })} /></label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((d, i) => (
          <button type="button" key={d} aria-pressed={f.release_days.includes(i)} onClick={() => setF({ ...f, release_days: f.release_days.includes(i) ? f.release_days.filter((x) => x !== i) : [...f.release_days, i].sort() })} className={cx("rounded-full px-3 py-1 text-xs", f.release_days.includes(i) ? "bg-white text-night" : "bg-white/5 text-mist")}>{d}</button>
        ))}
      </div>
      <div className="flex items-center gap-3"><button className="btn-primary btn-sm">Save schedule</button>{msg && <span role="status" className="text-xs text-mist">{msg}</span>}</div>
    </form>
  );
}
