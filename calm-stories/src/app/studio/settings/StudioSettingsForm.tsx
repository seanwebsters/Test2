"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StudioSettings } from "@/lib/studio/types";

export function StudioSettingsForm({ initial, canEdit }: { initial: StudioSettings; canEdit: boolean }) {
  const router = useRouter();
  const { id: _id, updated_at: _u, ...rest } = initial;
  const [f, setF] = useState(rest);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/studio/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    setMsg(res.ok ? "Saved." : (((await res.json().catch(() => ({}))) as { error?: string; issues?: string[] }).issues?.join(" ") ?? "Couldn't save."));
    if (res.ok) router.refresh();
  };
  const text = (k: keyof typeof f, label: string, hint?: string) => (
    <label className="text-xs text-mist">{label}<input className="input mt-1 text-sm" value={String(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.value })} />{hint && <span className="mt-1 block text-[11px] text-mist/70">{hint}</span>}</label>
  );
  const num = (k: keyof typeof f, label: string, hint?: string) => (
    <label className="text-xs text-mist">{label}<input type="number" className="input mt-1 text-sm" value={Number(f[k])} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} />{hint && <span className="mt-1 block text-[11px] text-mist/70">{hint}</span>}</label>
  );
  return (
    <form onSubmit={save} className="mt-4">
      <fieldset disabled={!canEdit} className="mb-6 rounded-2xl border border-lavender/30 bg-lavender/[0.05] p-4">
        <label className="flex items-center gap-2 text-white"><input type="checkbox" className="accent-lavender" checked={f.autopilot} onChange={(e) => setF({ ...f, autopilot: e.target.checked })} /> <span className="font-serif text-xl">Autopilot</span></label>
        <p className="mt-1 text-xs text-mist">The Program Director invents new series from audience data and catalogue gaps – no brief needed – and the team develops them up to your greenlight. Greenlit series get a release schedule automatically. Publishing still always needs your approval.</p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {num("autopilot_pipeline", "Series in development at once")}
          {num("autopilot_series_per_day", "New series per day")}
          {num("autopilot_episodes_per_week", "Episodes per week for greenlit series", "0 = don't schedule automatically")}
        </div>
      </fieldset>
      <fieldset disabled={!canEdit} className="grid gap-4 md:grid-cols-3">
        {text("default_model", "Default Claude model", "Agents without their own model use this.")}
        {text("image_model", "Nano Banana model", "e.g. gemini-2.5-flash-image, or a newer Nano Banana model")}
        <label className="text-xs text-mist">Image size<select className="input mt-1 text-sm" value={f.image_size} onChange={(e) => setF({ ...f, image_size: e.target.value as typeof f.image_size })}>{["", "1K", "2K", "4K"].map((x) => <option key={x} value={x}>{x || "Model default"}</option>)}</select><span className="mt-1 block text-[11px] text-mist/70">Only for models that support imageSize.</span></label>
        {text("tts_model", "ElevenLabs narration model")}
        {text("sfx_model", "ElevenLabs sound-effects model")}
        {text("music_model", "ElevenLabs music model")}
        {num("max_revision_rounds", "Revision rounds (max)", "Per writing, continuity and QC loop.")}
        {num("max_parallel_steps", "Parallel steps per workflow")}
        {num("max_concurrent_runs", "Workflows at once")}
        {num("default_episode_budget_cents", "Episode budget (¢)")}
        {num("default_series_budget_cents", "Series development budget (¢)")}
        <div className="space-y-2 text-xs text-mist">
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-lavender" checked={f.web_research} onChange={(e) => setF({ ...f, web_research: e.target.checked })} /> Program Director may research the web</label>
          <div>Who may publish episodes</div>
          {(["admin", "editor"] as const).map((r) => (
            <label key={r} className="flex items-center gap-2"><input type="checkbox" className="accent-lavender" checked={f.publish_roles.includes(r)} onChange={(e) => setF({ ...f, publish_roles: e.target.checked ? [...f.publish_roles, r] : f.publish_roles.filter((x) => x !== r) })} /> {r}</label>
          ))}
          <p className="text-[11px] text-mist/70">Agents can never publish.</p>
        </div>
      </fieldset>
      {canEdit ? <div className="mt-4 flex items-center gap-3"><button className="btn-primary btn-sm">Save settings</button>{msg && <span role="status" className="text-sm text-mist">{msg}</span>}</div> : <p className="mt-3 text-xs text-mist">Only administrators can change these.</p>}
    </form>
  );
}
