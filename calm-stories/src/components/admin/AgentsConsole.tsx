"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Btn, Field, StatusPill, inputCls } from "@/components/storymaker/ui";
import type { AgentConfiguration, AiProductionJob, ProductionWorkflow } from "@/lib/types";
import { cx, formatCents, formatDateTime, relativeTime } from "@/lib/util";
import { useAdminAction } from "./useAdminAction";

type Job = AiProductionJob & { episode_title: string | null };
interface SeriesOpt {
  id: string;
  title: string;
  official: boolean;
  narrator_voice_id: string | null;
  soundscape_id: string | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AgentsConsole(props: { initialJobId: string | null; agents: AgentConfiguration[]; jobs: Job[]; series: SeriesOpt[]; workflows: ProductionWorkflow[]; voices: { id: string; name: string }[]; soundscapes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(props.initialJobId ?? props.jobs[0]?.id ?? null);
  const active = props.jobs.some((j) => j.status === "running" || j.status === "queued");
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [active, router]);
  const job = props.jobs.find((j) => j.id === selected) ?? null;
  const seriesTitle = (id: string | null) => props.series.find((s) => s.id === id)?.title ?? "Series";

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-4xl font-semibold">Agents & jobs</h1>
        <p className="mt-1 text-sm text-mist">Seven production agents run a 13-step pipeline. Every episode they make stops at editorial review.</p>
      </header>

      <RunForm series={props.series} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Jobs</h2>
          <ul className="mt-3 space-y-2">
            {props.jobs.map((j) => {
              const done = j.steps.filter((s) => s.status === "succeeded").length;
              return (
                <li key={j.id}>
                  <button onClick={() => setSelected(j.id)} aria-pressed={selected === j.id} className={cx("w-full rounded-2xl border p-3 text-left text-sm", selected === j.id ? "border-lavender/60 bg-lavender/10" : "border-white/10 bg-white/[0.03] hover:border-white/20")}>
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {seriesTitle(j.series_id)}
                        {j.episode_title ? `: ${j.episode_title}` : ""}
                      </span>
                      <StatusPill status={j.status} />
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className={cx("h-full", j.status === "failed" ? "bg-rose-300" : "bg-lavender")} style={{ width: `${(done / j.steps.length) * 100}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-mist">
                      {done}/{j.steps.length} steps · {formatCents(j.cost_cents)}
                      {j.simulated ? " (simulated)" : ""} · {relativeTime(j.created_at)}
                      {j.workflow_id ? " · scheduled workflow" : ""}
                    </p>
                  </button>
                </li>
              );
            })}
            {!props.jobs.length && <li className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-mist">No jobs yet.</li>}
          </ul>
        </div>
        <div>{job ? <JobDetail job={job} seriesTitle={seriesTitle(job.series_id)} agents={props.agents} /> : null}</div>
      </section>

      <section>
        <h2 className="font-serif text-2xl font-semibold">Agents</h2>
        <ul className="mt-3 grid gap-4 lg:grid-cols-2">
          {props.agents.map((a) => (
            <li key={a.id}>
              <AgentCard agent={a} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-2xl font-semibold">Scheduled workflows</h2>
        <p className="mt-1 text-sm text-mist">An active workflow keeps every release slot in the coming week in production. Releases still need an editor&apos;s approval.</p>
        <ul className="mt-3 grid gap-4 lg:grid-cols-2">
          {props.series
            .filter((s) => s.official)
            .map((s) => (
              <li key={s.id}>
                <WorkflowCard series={s} wf={props.workflows.find((w) => w.series_id === s.id) ?? null} voices={props.voices} soundscapes={props.soundscapes} />
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function RunForm({ series }: { series: SeriesOpt[] }) {
  const { call, pending, message } = useAdminAction();
  const [f, setF] = useState({ seriesId: series[0]?.id ?? "", budget: 25, minutes: 30 });
  return (
    <form
      className="card-surface grid gap-3 p-5 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        void call("/api/admin/jobs", "POST", { seriesId: f.seriesId, budgetCents: Math.round(f.budget * 100), durationMinutes: f.minutes }, "Job queued.");
      }}
    >
      <Field label="Produce the next episode of">
        <select value={f.seriesId} onChange={(e) => setF({ ...f, seriesId: e.target.value })} className={inputCls}>
          {series.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
              {s.official ? " (Calm Original)" : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Budget (USD)">
        <input type="number" min={0} step={1} value={f.budget} onChange={(e) => setF({ ...f, budget: Number(e.target.value) })} className={inputCls} />
      </Field>
      <Field label="Length">
        <select value={f.minutes} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })} className={inputCls}>
          {[10, 15, 20, 30, 45].map((m) => (
            <option key={m} value={m}>{m} minutes</option>
          ))}
        </select>
      </Field>
      <Btn variant="primary" type="submit" disabled={pending}>
        Start production
      </Btn>
      {message && <p role="status" className="text-xs text-mist md:col-span-4">{message}</p>}
    </form>
  );
}

function JobDetail({ job, seriesTitle, agents }: { job: Job; seriesTitle: string; agents: AgentConfiguration[] }) {
  const { call, pending, message } = useAdminAction();
  const act = (action: string) => call(`/api/admin/jobs/${job.id}`, "POST", { action });
  const agentName = (k: string) => agents.find((a) => a.agent === k)?.name ?? k;
  return (
    <div className="card-surface p-5">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-mist">Job {job.id.slice(0, 12)} · requested {formatDateTime(job.created_at)}</p>
          <h3 className="font-serif text-2xl font-semibold">{seriesTitle}{job.episode_title ? `: ${job.episode_title}` : ""}</h3>
          <p className="text-xs text-mist">
            Cost {formatCents(job.cost_cents)}{job.budget_cents !== null ? ` of ${formatCents(job.budget_cents)} budget` : ""}{job.simulated ? " · includes simulated providers" : ""}
          </p>
        </div>
        <StatusPill status={job.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(job.status === "queued" || job.status === "running") && <Btn variant="outline" disabled={pending} onClick={() => act("pause")}>Pause</Btn>}
        {job.status === "paused" && <Btn variant="primary" disabled={pending} onClick={() => act("resume")}>Resume</Btn>}
        {["queued", "running", "paused"].includes(job.status) && <Btn variant="danger" disabled={pending} onClick={() => act("cancel")}>Cancel</Btn>}
        {(job.status === "failed" || job.status === "cancelled") && <Btn variant="primary" disabled={pending} onClick={() => act("retry")}>Retry from failed step</Btn>}
        {["failed", "cancelled", "succeeded"].includes(job.status) && <Btn variant="outline" disabled={pending} onClick={() => act("rerun")}>Run again</Btn>}
        {message && <span role="status" className="self-center text-xs text-amber-200">{message}</span>}
      </div>
      {job.error && <p role="alert" className="mt-3 rounded-2xl bg-rose-300/10 px-3 py-2 text-sm text-rose-100">{job.error}</p>}
      <ol className="mt-4 space-y-1.5">
        {job.steps.map((s, i) => (
          <li key={s.id} className={cx("flex items-start gap-3 rounded-xl px-3 py-2 text-sm", s.status === "running" ? "bg-periwinkle/10" : "")}>
            <span className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px]", s.status === "succeeded" ? "bg-lavender text-night" : s.status === "failed" ? "bg-rose-300 text-night" : s.status === "running" ? "animate-pulse bg-periwinkle text-night" : "border border-white/20 text-mist")}>
              {s.status === "succeeded" ? "✓" : s.status === "failed" ? "!" : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-medium">{s.label}</span> <span className="text-xs text-mist">· {agentName(s.agent)}{s.attempts > 1 ? ` · ${s.attempts} attempts` : ""}{s.cost_cents ? ` · ${formatCents(s.cost_cents)}` : ""}</span>
              {s.output_preview && <span className="block text-xs text-mist">{s.output_preview}</span>}
              {s.error && <span className="block text-xs text-rose-200">{s.error}</span>}
            </span>
          </li>
        ))}
      </ol>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-mist">Logs ({job.logs.length})</summary>
        <ol className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-2xl bg-black/20 p-3 font-mono text-[11px]">
          {job.logs.map((l, i) => (
            <li key={i} className={l.level === "error" ? "text-rose-200" : l.level === "warn" ? "text-amber-200" : "text-mist"}>
              {l.at.slice(11, 19)} {l.step ? `[${l.step}] ` : ""}{l.message}
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentConfiguration }) {
  const { call, pending, message } = useAdminAction();
  const [a, setA] = useState(agent);
  const dirty = JSON.stringify(a) !== JSON.stringify(agent);
  const isAudio = agent.agent === "audio_producer";
  return (
    <form
      className={cx("card-surface space-y-3 p-5", !a.enabled && "opacity-70")}
      onSubmit={(e) => {
        e.preventDefault();
        void call(`/api/admin/agents/${agent.id}`, "PATCH", { provider: a.provider, model: a.model, prompt_template: a.prompt_template, temperature: a.temperature, max_cost_cents_per_job: a.max_cost_cents_per_job, retry_limit: a.retry_limit, enabled: a.enabled }, "Saved.");
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-xl font-semibold">{agent.name}</h3>
          <p className="text-sm text-mist">{agent.description}</p>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={a.enabled} onChange={(e) => setA({ ...a, enabled: e.target.checked })} className="accent-lavender" />
          Enabled
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {!isAudio && (
          <Field label="Provider">
            <select value={a.provider} onChange={(e) => setA({ ...a, provider: e.target.value as AgentConfiguration["provider"] })} className={inputCls}>
              <option value="auto">Auto (AI Settings)</option>
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="mock">Simulated</option>
            </select>
          </Field>
        )}
        <Field label="Model">
          <input value={a.model} onChange={(e) => setA({ ...a, model: e.target.value })} className={inputCls} />
        </Field>
        <Field label={`Temperature ${a.temperature.toFixed(1)}`}>
          <input type="range" min={0} max={1} step={0.1} value={a.temperature} onChange={(e) => setA({ ...a, temperature: Number(e.target.value) })} className="range w-full" />
        </Field>
        <Field label="Cost limit per job (USD)">
          <input type="number" min={0} step={0.05} value={a.max_cost_cents_per_job / 100} onChange={(e) => setA({ ...a, max_cost_cents_per_job: Math.round(Number(e.target.value) * 100) })} className={inputCls} />
        </Field>
        <Field label="Retries">
          <input type="number" min={0} max={5} value={a.retry_limit} onChange={(e) => setA({ ...a, retry_limit: Number(e.target.value) })} className={inputCls} />
        </Field>
      </div>
      {!isAudio && (
        <Field label="Instructions">
          <textarea rows={3} value={a.prompt_template} onChange={(e) => setA({ ...a, prompt_template: e.target.value })} className={inputCls} />
        </Field>
      )}
      <div className="flex items-center gap-3">
        <Btn variant="primary" type="submit" disabled={!dirty || pending}>Save</Btn>
        {message && <span role="status" className="text-xs text-mist">{message}</span>}
      </div>
    </form>
  );
}

function WorkflowCard({ series, wf, voices, soundscapes }: { series: SeriesOpt; wf: ProductionWorkflow | null; voices: { id: string; name: string }[]; soundscapes: { id: string; name: string }[] }) {
  const { call, pending, message } = useAdminAction();
  const initial = {
    episodes_per_week: wf?.episodes_per_week ?? 2,
    target_duration_minutes: wf?.target_duration_minutes ?? 30,
    narrator_voice_id: wf?.narrator_voice_id ?? series.narrator_voice_id ?? voices[0]?.id ?? null,
    soundscape_id: wf?.soundscape_id ?? series.soundscape_id ?? null,
    release_days: wf?.release_days ?? [2, 5],
    release_hour_utc: wf?.release_hour_utc ?? 19,
    max_budget_cents: wf?.max_budget_cents ?? 2500,
    status: wf?.status ?? "paused",
  };
  const [f, setF] = useState(initial);
  const save = (patch: Partial<typeof f> = {}) => call(`/api/admin/workflows/${series.id}`, "PUT", { ...f, ...patch }, "Workflow saved.");
  return (
    <div className="card-surface space-y-3 p-5">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate font-serif text-xl font-semibold">{series.title}</h3>
        <StatusPill status={wf ? f.status : "not set up"} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Episodes per week">
          <input type="number" min={1} max={7} value={f.episodes_per_week} onChange={(e) => setF({ ...f, episodes_per_week: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="Minutes each">
          <input type="number" min={5} max={60} value={f.target_duration_minutes} onChange={(e) => setF({ ...f, target_duration_minutes: Number(e.target.value) })} className={inputCls} />
        </Field>
        <Field label="Budget per episode (USD)">
          <input type="number" min={0} value={f.max_budget_cents / 100} onChange={(e) => setF({ ...f, max_budget_cents: Math.round(Number(e.target.value) * 100) })} className={inputCls} />
        </Field>
        <Field label="Narrator">
          <select value={f.narrator_voice_id ?? ""} onChange={(e) => setF({ ...f, narrator_voice_id: e.target.value || null })} className={inputCls}>
            {voices.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Soundscape">
          <select value={f.soundscape_id ?? ""} onChange={(e) => setF({ ...f, soundscape_id: e.target.value || null })} className={inputCls}>
            <option value="">None</option>
            {soundscapes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Release hour (UTC)">
          <input type="number" min={0} max={23} value={f.release_hour_utc} onChange={(e) => setF({ ...f, release_hour_utc: Number(e.target.value) })} className={inputCls} />
        </Field>
      </div>
      <fieldset>
        <legend className="text-xs text-mist">Release days</legend>
        <div className="mt-1 flex flex-wrap gap-1">
          {DAYS.map((d, i) => (
            <button key={d} type="button" aria-pressed={f.release_days.includes(i)} onClick={() => setF({ ...f, release_days: f.release_days.includes(i) ? f.release_days.filter((x) => x !== i) : [...f.release_days, i].sort() })} className={cx("rounded-full px-3 py-1 text-xs", f.release_days.includes(i) ? "bg-lavender/25 text-white" : "border border-white/10 text-mist")}>
              {d}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="outline" disabled={pending} onClick={() => save()}>Save</Btn>
        {f.status === "active" ? (
          <Btn disabled={pending} onClick={() => (setF({ ...f, status: "paused" }), save({ status: "paused" }))}>Pause workflow</Btn>
        ) : (
          <Btn variant="primary" disabled={pending} onClick={() => (setF({ ...f, status: "active" }), save({ status: "active" }))}>Activate</Btn>
        )}
        {wf && <span className="text-xs text-mist">Updated {formatDateTime(wf.updated_at)}</span>}
        {message && <span role="status" className="text-xs text-mist">{message}</span>}
      </div>
    </div>
  );
}
