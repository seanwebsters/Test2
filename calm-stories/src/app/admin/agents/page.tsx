import Link from "next/link";
import { getDb } from "@/lib/db";
import { AdminAction, AutoRefresh } from "@/components/admin/AdminAction";
import { AGENTS } from "@/lib/types";
import { providerStatus } from "@/lib/agents";
import { cx, formatCents, relativeTime } from "@/lib/util";
import { isStaff } from "../staff";
import { ProduceForm } from "./ProduceForm";

export const metadata = { title: "Agents" };

const STATUS_STYLE: Record<string, string> = {
  failed: "text-rose-300",
  succeeded: "text-emerald-200",
  running: "text-lavender",
  queued: "text-mist",
  paused: "text-amber-200",
  cancelled: "text-mist",
};

export default async function AgentsPage() {
  if (!(await isStaff())) return null;
  const db = getDb();
  const [jobs, series] = await Promise.all([db.list("production_jobs", { orderBy: { column: "created_at", ascending: false }, limit: 40 }), db.list("series")]);
  const providers = providerStatus();
  const active = jobs.filter((j) => ["queued", "running"].includes(j.status));
  const title = (id: string) => series.find((s) => s.id === id)?.title ?? "—";
  return (
    <div className="space-y-10">
      <AutoRefresh active={active.length > 0} intervalMs={2000} />

      <section aria-labelledby="providers-h">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="providers-h" className="headline text-3xl">Production agents</h2>
            <p className="max-w-2xl text-sm text-mist">
              Agents plan, write, narrate, score and illustrate each episode, then file it in the review queue. Nothing goes live until an editor approves it.
            </p>
          </div>
          <ProduceForm series={series.filter((s) => s.status !== "removed").map((s) => ({ id: s.id, title: s.title }))} />
        </div>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(providers).map(([k, p]) => (
            <li key={k} className="card p-4">
              <div className="text-xs uppercase tracking-wider text-mist">{k}</div>
              <div className="mt-1 font-medium">{p.name}</div>
              <div className={cx("mt-1 text-sm", p.connected ? "text-emerald-200" : "text-amber-200")}>
                {p.connected ? "Connected" : k === "mastering" ? "Not installed – WAV output" : "No key – offline stand-in (labelled simulated)"}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="agents-h">
        <h2 id="agents-h" className="headline text-2xl">The crew</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {AGENTS.map((a) => {
            const steps = jobs.flatMap((j) => j.steps.filter((s) => s.agent === a.kind).map((s) => ({ s, j })));
            const current = steps.find(({ s }) => s.status === "running");
            const ok = steps.filter(({ s }) => s.status === "succeeded");
            const last = ok.sort((x, y) => ((x.s.finished_at ?? "") < (y.s.finished_at ?? "") ? 1 : -1))[0];
            const failures = steps.filter(({ s }) => s.status === "failed").length;
            const avg = ok.length ? ok.reduce((n, { s }) => n + s.cost_cents, 0) / ok.length : 0;
            return (
              <article key={a.kind} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-xl">{a.name}</h3>
                  <span className={cx("chip", current ? "bg-lavender/20 text-lavender" : "")}>{current ? "Working" : "Idle"}</span>
                </div>
                <p className="text-xs text-lavender">{a.provider}</p>
                <p className="mt-1 text-sm text-mist">{a.role}</p>
                {current && <p className="mt-2 text-xs">Now: {title(current.j.series_id)}</p>}
                <dl className="mt-3 grid grid-cols-3 gap-1.5 text-[11px]">
                  <div className="rounded-lg bg-white/[0.03] p-1.5"><dt className="text-mist">Runs</dt><dd>{ok.length}</dd></div>
                  <div className="rounded-lg bg-white/[0.03] p-1.5"><dt className="text-mist">Avg cost</dt><dd>{formatCents(avg)}</dd></div>
                  <div className="rounded-lg bg-white/[0.03] p-1.5"><dt className="text-mist">Failed</dt><dd className={failures ? "text-rose-300" : ""}>{failures}</dd></div>
                </dl>
                {last?.s.output_preview && <p className="mt-2 line-clamp-2 text-[11px] text-mist">“{last.s.output_preview}”</p>}
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="jobs-h">
        <h2 id="jobs-h" className="headline text-2xl">Production runs</h2>
        <ul className="mt-4 space-y-3">
          {jobs.map((j) => {
            const done = j.steps.filter((s) => s.status === "succeeded" || s.status === "skipped").length;
            const simulated = j.steps.some((s) => s.simulated);
            return (
              <li key={j.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {title(j.series_id)}
                      {j.episode_id && <span className="text-mist"> · {j.steps[0]?.output_preview?.split(" – ")[0] ?? "episode"}</span>}
                    </div>
                    <div className="text-xs text-mist">
                      {relativeTime(j.created_at)} · {formatCents(j.cost_cents)}
                      {j.budget_cents !== null ? ` of ${formatCents(j.budget_cents)} budget` : ""}
                      {j.payload.release_at ? ` · for ${new Date(String(j.payload.release_at)).toUTCString().slice(0, 22)}` : ""}
                      {simulated ? " · includes simulated output" : ""}
                    </div>
                  </div>
                  <span className={STATUS_STYLE[j.status]}>{j.status}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["queued", "running"].includes(j.status) && <AdminAction endpoint={`/api/admin/jobs/${j.id}`} body={{ action: "pause" }} label="Pause" className="btn-ghost btn-sm" />}
                    {j.status === "paused" && <AdminAction endpoint={`/api/admin/jobs/${j.id}`} body={{ action: "resume" }} label="Resume" className="btn-ghost btn-sm" />}
                    {!["succeeded", "failed", "cancelled"].includes(j.status) && <AdminAction endpoint={`/api/admin/jobs/${j.id}`} body={{ action: "cancel" }} label="Cancel" confirmText="Cancel this run?" className="btn-ghost btn-sm" />}
                    {["failed", "cancelled"].includes(j.status) && <AdminAction endpoint={`/api/admin/jobs/${j.id}`} body={{ action: "retry" }} label="Retry" className="btn-ghost btn-sm" />}
                    {j.status === "succeeded" && j.episode_id && <Link href="/admin/review" className="btn-ghost btn-sm">Review</Link>}
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-gradient-to-r from-periwinkle to-lavender" style={{ width: `${(done / Math.max(1, j.steps.length)) * 100}%` }} />
                </div>
                {j.error && <p className="mt-2 text-xs text-rose-300">{j.error}</p>}
                <details className="mt-3" open={j.status === "running"}>
                  <summary className="cursor-pointer text-xs text-mist">Steps & log</summary>
                  <ol className="mt-2 grid gap-1.5 text-xs md:grid-cols-2">
                    {j.steps.map((s) => (
                      <li key={s.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                        <div className="flex justify-between gap-2">
                          <span>
                            {s.status === "succeeded" ? "✓" : s.status === "running" ? "…" : s.status === "failed" ? "✗" : s.status === "skipped" ? "–" : "○"} {s.label}{" "}
                            <span className="text-mist">({AGENTS.find((a) => a.kind === s.agent)?.name})</span>
                            {s.simulated && <span className="ml-1 rounded bg-amber-200/10 px-1 text-amber-200">simulated</span>}
                          </span>
                          <span className="text-mist">{s.attempts > 1 ? `${s.attempts} tries · ` : ""}{formatCents(s.cost_cents)}</span>
                        </div>
                        {s.output_preview && <p className="mt-1 line-clamp-3 text-mist">{s.output_preview}</p>}
                        {s.error && <p className="mt-1 text-rose-300">{s.error}</p>}
                      </li>
                    ))}
                  </ol>
                  <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-night/70 p-3 text-[11px] text-mist">
                    {j.logs.map((l) => `${l.at.slice(11, 19)} ${l.level.toUpperCase().padEnd(5)} ${l.step ? `[${l.step}] ` : ""}${l.message}`).join("\n")}
                  </pre>
                </details>
              </li>
            );
          })}
          {jobs.length === 0 && <li className="text-sm text-mist">No production runs yet. Produce an episode above, or switch on a series schedule from the Overview.</li>}
        </ul>
      </section>
    </div>
  );
}
