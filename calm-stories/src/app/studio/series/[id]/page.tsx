import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getBible } from "@/lib/studio/bible";
import { AdminAction } from "@/components/admin/AdminAction";
import { DataView } from "@/components/studio/DeliverableView";
import { SceneArt } from "@/components/art/SceneArt";
import { cx, relativeTime } from "@/lib/util";
import { isStaff } from "@/app/admin/staff";
import { ScheduleForm } from "./ScheduleForm";
import { GuidelinesEditor } from "../../settings/GuidelinesEditor";

export const metadata = { title: "Series bible" };

export default async function StudioSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isStaff())) return null;
  const { id } = await params;
  const db = getDb();
  const series = await db.get("series", id);
  if (!series) notFound();
  const [bible, project, chars, rels, plans, episodes, versions, schedule, art, guidelines, runs] = await Promise.all([
    getBible(id),
    db.findOne("series_projects", { series_id: id }),
    db.list("characters", { where: { series_id: id } }),
    db.list("relationships", { where: { series_id: id } }),
    db.list("season_plans", { where: { series_id: id } }),
    db.list("episodes", { where: { series_id: id } }),
    db.list("bible_versions", { where: { series_id: id }, orderBy: { column: "version", ascending: false }, limit: 12 }),
    db.findOne("production_workflows", { series_id: id }),
    db.list("artwork_assets", { where: { series_id: id } }),
    db.get("writing_guidelines", id),
    db.list("workflow_runs", { where: { series_id: id, kind: "episode_production" } }),
  ]);
  const greenlit = project?.status === "greenlit";
  const identity = bible.identity;
  return (
    <div className="space-y-10">
      <header className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl ring-1 ring-white/10"><div className="aspect-[2/3]"><SceneArt spec={series.artwork} className="h-full w-full" /></div></div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-lavender">{project ? `Studio original · ${project.status.replace("_", " ")}` : "Catalogue series"}</p>
          <h1 className="font-serif text-5xl text-white">{series.title}</h1>
          <p className="mt-1 font-serif text-xl italic text-white/85">{series.tagline}</p>
          <p className="mt-3 max-w-3xl text-white/90">{identity?.premise ?? series.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {greenlit && <AdminAction endpoint="/api/studio/episodes" body={{ series_id: id }} label="Commission next episode" pendingLabel="Commissioning…" className="btn-primary btn-sm" />}
            {project && <Link href={`/studio/projects/${project.id}`} className="btn-ghost btn-sm">Development history</Link>}
            {series.status === "published" && <Link href={`/series/${series.slug}`} className="btn-ghost btn-sm">View in app</Link>}
          </div>
          {!greenlit && project && <p className="mt-3 text-sm text-amber-200">Episodes can be produced once you greenlight the series.</p>}
        </div>
      </header>

      {identity && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="font-serif text-3xl text-white">Identity &amp; style</h2>
          <div className="mt-4"><DataView value={{ logline: identity.logline, tone: identity.tone, themes: identity.themes, narrative_voice: identity.narrative_voice, point_of_view: `${identity.point_of_view} · ${identity.tense}`, romance_heat: identity.romance_heat, episode_shape: identity.episode_shape, style_rules: identity.style_rules, content_boundaries: identity.content_boundaries }} /></div>
        </section>
      )}

      {chars.length > 0 && (
        <section>
          <h2 className="font-serif text-3xl text-white">Characters</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {chars.map((c) => {
              const p = art.find((a) => a.id === c.portrait_asset_id);
              return (
                <li key={c.id} className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                  {p ? <img src={p.variants["400w"] ?? p.url} alt={`${c.name} portrait`} className="h-36 w-28 shrink-0 rounded-2xl object-cover" /> : <div className="h-36 w-28 shrink-0 rounded-2xl bg-white/5" />}
                  <div className="min-w-0 text-sm">
                    <div className="font-serif text-2xl text-white">{c.name}</div>
                    <div className="text-xs text-mist">{c.role.replace("_", " ")} · {c.age} · {c.pronouns}{c.voice_name ? ` · voiced by ${c.voice_name}` : ""}</div>
                    <p className="mt-2 text-white/90">{c.personality}</p>
                    <p className="mt-1 text-mist"><span className="text-white/70">Wants:</span> {c.desires} <span className="text-white/70">Fears:</span> {c.fears}</p>
                    <p className="mt-1 text-mist"><span className="text-white/70">Voice:</span> {c.speech_style}</p>
                    <p className="mt-1 text-xs text-mist"><span className="text-white/70">Visual:</span> {c.visual_description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {rels.length > 0 && (
        <section>
          <h2 className="font-serif text-3xl text-white">Relationships</h2>
          <ul className="mt-4 space-y-3">
            {rels.map((r) => (
              <li key={r.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm">
                <div className="font-serif text-xl text-white">{r.a_name} &amp; {r.b_name} <span className="text-sm text-mist">· {r.kind}</span></div>
                <p className="text-white/90">{r.dynamic}</p>
                <p className="mt-1 text-mist">Chemistry: {r.chemistry}</p>
                <p className="mt-1 text-mist">Now: <span className="text-white/90">{r.current_state}</span></p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bible.world && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="font-serif text-3xl text-white">World: {bible.world.name}</h2>
          <div className="mt-4"><DataView value={bible.world} /></div>
        </section>
      )}

      {plans.map((p) => (
        <section key={p.id}>
          <h2 className="font-serif text-3xl text-white">Season {p.season_number}: {p.title}</h2>
          <p className="mt-1 max-w-3xl text-mist">{p.arc}</p>
          <ol className="mt-4 space-y-2">
            {p.episodes.map((e, idx) => {
              const ep = episodes.find((x) => x.number === e.number && x.status !== "rejected");
              return (
                <li key={`${e.number}-${idx}`} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm">
                  <span className="w-8 font-serif text-2xl text-lavender">{e.number}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-white">{ep?.title ?? e.title}</div>
                    <div className="text-xs text-mist">{e.premise}</div>
                  </div>
                  {ep ? <Link href={`/studio/writers-room/${ep.id}`} className={cx("rounded-full px-2.5 py-1 text-xs", ep.status === "published" ? "bg-emerald-300/15 text-emerald-200" : "bg-lavender/15 text-lavender")}>{ep.status.replace("_", " ")}</Link> : <span className="text-xs text-mist">planned</span>}
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-serif text-2xl text-white">Canon</h2>
          <h3 className="label mt-3">Timeline</h3>
          <ul className="space-y-1 text-sm text-white/90">{bible.timeline.map((t, i) => <li key={i}><span className="text-mist">{t.episode}</span> {t.summary}</li>)}{!bible.timeline.length && <li className="text-mist">No episodes yet.</li>}</ul>
          <h3 className="label mt-4">Open threads</h3>
          <ul className="list-disc pl-5 text-sm text-white/90">{bible.open_threads.map((t, i) => <li key={i}>{t}</li>)}</ul>
          <h3 className="label mt-4">Established facts</h3>
          <ul className="list-disc pl-5 text-sm text-white/80">{bible.established_facts.slice(-20).map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-serif text-2xl text-white">Bible history</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {versions.map((v) => (
              <li key={v.id} className="flex justify-between gap-3"><span className="text-white/90">v{v.version} · {v.reason}</span><span className="shrink-0 text-xs text-mist">{v.agent.replace("_", " ")} · {relativeTime(v.created_at)}</span></li>
            ))}
          </ul>
          {greenlit && (
            <>
              <h2 className="mt-6 font-serif text-2xl text-white">Release schedule</h2>
              <p className="text-sm text-mist">When active, the team commissions one episode per release slot (at least 36 hours ahead) and brings each back for your approval.</p>
              <ScheduleForm seriesId={id} initial={schedule ?? { status: "paused", episodes_per_week: 2, release_days: [2, 5], release_hour_utc: 20, target_minutes: identity?.target_minutes ?? 25, budget_cents: 1500 }} />
              <p className="mt-2 text-xs text-mist">{runs.length} episode workflow(s) so far.</p>
            </>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-serif text-2xl text-white">Series writing guidelines</h2>
        <p className="text-sm text-mist">Added to the house guidelines for every agent working on this series.</p>
        <GuidelinesEditor id={id} initial={guidelines ?? { id, content: "", benchmarks: [], updated_at: "" }} compact />
      </section>
    </div>
  );
}
