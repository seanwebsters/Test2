"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AgentConfiguration } from "@/lib/types";
import { cx, formatCents, relativeTime } from "@/lib/util";

export function AgentCard({
  agent,
  stats,
}: {
  agent: AgentConfiguration;
  stats: { current: string[]; last_success: string | null; last_preview: string | null; errors: string[]; avg_cost: number; runs: number };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ provider: agent.provider, model: agent.model, temperature: agent.temperature, max_cost_cents_per_job: agent.max_cost_cents_per_job, retry_limit: agent.retry_limit, prompt_template: agent.prompt_template, enabled: agent.enabled });
  const [err, setErr] = useState<string | null>(null);
  const save = async (patch: Partial<typeof f>) => {
    const res = await fetch(`/api/admin/agents/${agent.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    if (!res.ok) setErr(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Failed");
    else {
      setErr(null);
      setEditing(false);
      router.refresh();
    }
  };
  return (
    <article className={cx("card p-5", !agent.enabled && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-2xl">{agent.name}</h3>
          <p className="text-xs text-mist">{agent.provider} · {agent.model}</p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-mist">
          <input type="checkbox" className="accent-lavender" checked={agent.enabled} onChange={(e) => save({ enabled: e.target.checked })} /> Enabled
        </label>
      </div>
      <p className="mt-2 text-sm text-mist">{agent.description}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-white/[0.03] p-2"><dt className="text-mist">Current task</dt><dd className="mt-0.5">{stats.current[0] ?? "Idle"}</dd></div>
        <div className="rounded-xl bg-white/[0.03] p-2"><dt className="text-mist">Last success</dt><dd className="mt-0.5">{stats.last_success ? relativeTime(stats.last_success) : "—"}</dd></div>
        <div className="rounded-xl bg-white/[0.03] p-2"><dt className="text-mist">Avg cost / job</dt><dd className="mt-0.5">{formatCents(stats.avg_cost)} <span className="text-mist">({stats.runs} runs)</span></dd></div>
        <div className="rounded-xl bg-white/[0.03] p-2"><dt className="text-mist">Errors</dt><dd className={cx("mt-0.5", stats.errors.length > 0 && "text-rose-300")}>{stats.errors.length || "None"}</dd></div>
      </dl>
      {stats.last_preview && <p className="mt-3 line-clamp-3 rounded-xl bg-night/60 p-2 text-[11px] text-mist">“{stats.last_preview}”</p>}
      {stats.errors[0] && <p className="mt-2 text-[11px] text-rose-300">{stats.errors[0]}</p>}
      {editing ? (
        <form className="mt-4 space-y-2 text-xs" onSubmit={(e) => { e.preventDefault(); void save(f); }}>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-mist">Provider<select className="input mt-1 py-1.5 text-sm" value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value as typeof f.provider })}><option value="auto">auto</option><option value="anthropic">anthropic</option><option value="openai">openai</option><option value="mock">simulator</option></select></label>
            <label className="text-mist">Model<input className="input mt-1 py-1.5 text-sm" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /></label>
            <label className="text-mist">Temperature<input type="number" step="0.05" min={0} max={1.5} className="input mt-1 py-1.5 text-sm" value={f.temperature} onChange={(e) => setF({ ...f, temperature: Number(e.target.value) })} /></label>
            <label className="text-mist">Cost cap (¢/job)<input type="number" min={0} className="input mt-1 py-1.5 text-sm" value={f.max_cost_cents_per_job} onChange={(e) => setF({ ...f, max_cost_cents_per_job: Number(e.target.value) })} /></label>
            <label className="text-mist">Retries<input type="number" min={0} max={5} className="input mt-1 py-1.5 text-sm" value={f.retry_limit} onChange={(e) => setF({ ...f, retry_limit: Number(e.target.value) })} /></label>
          </div>
          <label className="block text-mist">Prompt template<textarea rows={4} className="input mt-1 text-sm" value={f.prompt_template} onChange={(e) => setF({ ...f, prompt_template: e.target.value })} /></label>
          <div className="flex gap-2"><button className="btn-primary btn-sm" type="submit">Save</button><button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button></div>
        </form>
      ) : (
        <button className="btn-ghost btn-sm mt-4" onClick={() => setEditing(true)}>Configure</button>
      )}
      {err && <p role="alert" className="mt-2 text-xs text-rose-300">{err}</p>}
    </article>
  );
}
