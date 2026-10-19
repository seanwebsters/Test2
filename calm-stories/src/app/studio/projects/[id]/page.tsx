import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { pipelineStages } from "@/lib/studio/pipeline-view";
import { PipelineStrip } from "@/components/studio/PipelineStrip";
import { DeliverableCard } from "@/components/studio/DeliverableView";
import { GateDecision } from "@/components/studio/GateDecision";
import { RunControls } from "@/components/studio/RunControls";
import { AutoRefresh } from "@/components/admin/AdminAction";
import { SceneArt } from "@/components/art/SceneArt";
import type { ConceptCritique, Concepts } from "@/lib/studio/schemas";
import { cx, formatCents } from "@/lib/util";
import { isStaff } from "@/app/admin/staff";

export const metadata = { title: "Series in development" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isStaff())) return null;
  const { id } = await params;
  const db = getDb();
  const project = await db.get("series_projects", id);
  if (!project) notFound();
  const run = project.run_id ? await db.get("workflow_runs", project.run_id) : null;
  const steps = run ? await db.list("workflow_steps", { where: { run_id: run.id } }) : [];
  const deliverables = run ? (await db.list("deliverables", { where: { run_id: run.id, status: "current" } })).sort((a, b) => (a.created_at < b.created_at ? -1 : 1)) : [];
  const series = project.series_id ? await db.get("series", project.series_id) : null;
  const concepts = deliverables.find((d) => d.key === "concepts")?.data as Concepts | undefined;
  const critique = deliverables.find((d) => d.key === "concept_critique")?.data as ConceptCritique | undefined;
  const gate = steps.find((s) => s.key === "greenlight" && s.status === "awaiting_approval");
  const blocked = steps.filter((s) => s.status === "blocked");
  const chars = series ? await db.list("characters", { where: { series_id: series.id } }) : [];
  const portraits = series ? await db.list("artwork_assets", { where: { series_id: series.id, kind: "character_portrait" } }) : [];
  const posters = series ? await db.list("artwork_assets", { where: { series_id: series.id, kind: "poster" } }) : [];
  return (
    <div className="space-y-8">
      <AutoRefresh active={run?.status === "running"} intervalMs={3000} />
      <header>
        <p className="text-[11px] uppercase tracking-[0.35em] text-lavender">Series development</p>
        <h1 className="font-serif text-5xl text-white">{series?.title ?? "New series"}</h1>
        <p className="mt-2 max-w-3xl text-mist">Brief: {project.brief}</p>
        {run && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-white/5 px-3 py-1 text-white">{run.status.replace("_", " ")}</span>
            <span className="text-mist">{formatCents(run.cost_cents)} of {formatCents(run.budget_cents)}</span>
            <RunControls run={run} steps={steps} />
            {series && <Link href={`/studio/series/${series.id}`} className="text-lavender">Open the series bible →</Link>}
          </div>
        )}
      </header>
      {run && <PipelineStrip stages={pipelineStages("series_development", steps, run.status)} />}
      {blocked.map((s) => (
        <p key={s.id} className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-4 text-sm text-amber-100">
          <strong>{s.label}</strong> is waiting: {s.error} {s.needs && s.needs !== "budget" ? "Connect it, then press Resume." : ""}
        </p>
      ))}

      {gate && series && (
        <section className="grid gap-6 rounded-3xl border border-amber-300/30 bg-gradient-to-br from-amber-200/[0.06] to-transparent p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl ring-1 ring-white/10"><div className="aspect-[2/3]"><SceneArt spec={series.artwork} className="h-full w-full" /></div></div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-amber-200">Ready for your greenlight</p>
            <h2 className="font-serif text-4xl text-white">{series.title}</h2>
            <p className="mt-1 font-serif text-xl italic text-white/85">{series.tagline}</p>
            <p className="mt-3 text-white/90">{series.description}</p>
            <ul className="mt-4 flex flex-wrap gap-3">
              {chars.map((c) => {
                const p = portraits.find((a) => a.id === c.portrait_asset_id);
                return (
                  <li key={c.id} className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-3 text-sm">
                    {p ? <img src={p.variants["300w"] ?? p.url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="h-9 w-9 rounded-full bg-white/10" />}
                    <span className="text-white">{c.name}</span>
                    <span className="text-xs text-mist">{c.role.replace("_", " ")}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-mist">Greenlighting casts voices, builds the pronunciation dictionary and starts episode one. Every episode still comes back to you before it publishes.</p>
            <div className="mt-4"><GateDecision runId={run!.id} stepKey="greenlight" /></div>
          </div>
        </section>
      )}

      {concepts && (
        <section>
          <h2 className="font-serif text-3xl text-white">Concepts</h2>
          <ul className="mt-4 grid gap-4 lg:grid-cols-3">
            {concepts.concepts.map((c, i) => {
              const ev = critique?.evaluations.find((e) => e.concept_index === i + 1);
              const picked = critique?.recommended_index === i + 1;
              return (
                <li key={i} className={cx("rounded-3xl border p-5", picked ? "border-lavender/60 bg-lavender/[0.06]" : "border-white/10 bg-white/[0.03]")}>
                  {picked && <span className="mb-2 inline-block rounded-full bg-lavender/20 px-2 py-0.5 text-xs text-lavender">Story Critic&rsquo;s pick</span>}
                  <h3 className="font-serif text-2xl text-white">{c.title}</h3>
                  <p className="mt-1 text-sm text-white/90">{c.logline}</p>
                  <p className="mt-2 text-xs text-mist">{c.romance_shape}</p>
                  {ev && (
                    <div className="mt-3 space-y-1 text-xs">
                      {ev.strengths.slice(0, 2).map((s, n) => <p key={n} className="text-emerald-200/90">+ {s}</p>)}
                      {ev.weaknesses.slice(0, 2).map((w, n) => <p key={n} className="text-amber-200/90">– {w.problem}</p>)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {critique && <p className="mt-3 text-sm text-mist">Critic&rsquo;s rationale: {critique.rationale}</p>}
        </section>
      )}

      {posters.length > 0 && (
        <section>
          <h2 className="font-serif text-3xl text-white">Poster concepts</h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {posters.map((p) => (
              <li key={p.id} className={cx("overflow-hidden rounded-2xl border", p.status === "selected" || p.status === "approved" ? "border-lavender" : "border-white/10")}>
                <img src={p.variants.titled ?? p.variants["600w"] ?? p.url} alt="Poster concept" className="aspect-[2/3] w-full object-cover" />
                <div className="p-2 text-xs text-mist">{p.status}{p.review?.consistency ? ` · ${p.review.consistency.slice(0, 80)}` : ""}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-serif text-3xl text-white">Deliverables</h2>
        {deliverables.filter((d) => !["concepts"].includes(d.key)).map((d) => <DeliverableCard key={d.id} d={d} />)}
        {!deliverables.length && <p className="text-mist">The team hasn&rsquo;t delivered anything yet.</p>}
      </section>
    </div>
  );
}
