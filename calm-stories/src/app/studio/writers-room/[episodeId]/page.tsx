import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { AGENT_BY_KEY } from "@/lib/studio/agents";
import { wordDiff } from "@/lib/studio/diff";
import type { Outline, RevisionBrief, ScenePlan } from "@/lib/studio/schemas";
import { DataView, DeliverableCard } from "@/components/studio/DeliverableView";
import { AutoRefresh } from "@/components/admin/AdminAction";
import { cx, relativeTime, wordCount } from "@/lib/util";
import { isStaff } from "@/app/admin/staff";
import { ScriptEditor } from "./ScriptEditor";

export const metadata = { title: "Writers' Room" };

type Script = { scenes: { index: number; title: string; text: string }[] };

export default async function EpisodeRoom({ params, searchParams }: { params: Promise<{ episodeId: string }>; searchParams: Promise<{ v?: string; compare?: string }> }) {
  if (!(await isStaff())) return null;
  const { episodeId } = await params;
  const sp = await searchParams;
  const db = getDb();
  const ep = await db.get("episodes", episodeId);
  if (!ep) notFound();
  const series = await db.get("series", ep.series_id);
  const all = (await db.list("deliverables", { where: { episode_id: episodeId } })).sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const runs = await db.list("workflow_runs", { where: { episode_id: episodeId } });
  const running = runs.some((r) => r.status === "running");
  const latest = (key: string) => all.filter((d) => d.key === key).sort((a, b) => b.version - a.version)[0];
  const outline = latest("outline");
  const plan = latest("scene_plan");
  const scripts = all.filter((d) => d.key === "script").sort((a, b) => a.version - b.version);
  const shown = scripts.find((s) => String(s.version) === sp.v) ?? scripts[scripts.length - 1];
  const compareTo = sp.compare ? scripts.find((s) => String(s.version) === sp.compare) : shown ? scripts.find((s) => s.version === shown.version - 1) : undefined;
  const reviews = all.filter((d) => d.kind === "review");
  const briefs = all.filter((d) => d.kind === "revision_brief");
  const others = all.filter((d) => ["bible_update", "audio_direction", "qc_report", "cover_review"].includes(d.key)).filter((d) => d.status === "current");
  const s = shown?.data as Script | undefined;
  const c = compareTo?.data as Script | undefined;
  return (
    <div className="space-y-10">
      <AutoRefresh active={running} intervalMs={4000} />
      <header>
        <Link href="/studio/writers-room" className="text-sm text-mist">← Writers&rsquo; Room</Link>
        <p className="mt-2 text-[11px] uppercase tracking-[0.35em] text-lavender">{series?.title} · Episode {ep.number}</p>
        <h1 className="font-serif text-5xl text-white">{ep.title}</h1>
        <p className="mt-1 max-w-3xl text-white/85">{ep.summary}</p>
        <p className="mt-2 text-sm text-mist">Status: {ep.status.replace("_", " ")} · {runs.length} workflow(s) · <Link className="text-lavender" href={`/studio/pipeline?run=${runs[0]?.id ?? ""}`}>pipeline</Link></p>
      </header>

      {outline && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="font-serif text-3xl text-white">Outline <span className="text-sm text-mist">v{outline.version} · {AGENT_BY_KEY[outline.agent].name}</span></h2>
          <div className="mt-4"><DataView value={outline.data as Outline} /></div>
        </section>
      )}

      {plan && (
        <section>
          <h2 className="font-serif text-3xl text-white">Scene plan</h2>
          <p className="text-sm text-mist">Intensity must fall after the midpoint so the episode settles toward sleep.</p>
          <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(plan.data as ScenePlan).scenes.map((sc, idx) => (
              <li key={`${sc.index}-${idx}`} className="rounded-2xl bg-white/[0.03] p-4 text-sm">
                <div className="flex items-baseline justify-between"><span className="font-serif text-xl text-white">{sc.index}. {sc.title}</span><span className="text-xs text-mist">{sc.target_words}w</span></div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-periwinkle to-amber-200" style={{ width: `${Math.round(sc.intensity * 100)}%` }} /></div>
                <p className="mt-2 text-white/85">{sc.purpose}</p>
                <p className="mt-1 text-xs text-mist">{sc.location} · {sc.characters.join(", ")}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {s && shown && (
        <section>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-serif text-3xl text-white">Script</h2>
            <nav className="flex flex-wrap gap-1.5" aria-label="Versions">
              {scripts.map((v) => (
                <Link key={v.id} href={`?v=${v.version}`} className={cx("rounded-full px-3 py-1 text-xs", v.id === shown.id ? "bg-white text-night" : "bg-white/5 text-mist hover:text-white")}>
                  v{v.version} · {v.agent === "network_executive" ? "you" : AGENT_BY_KEY[v.agent].name}
                </Link>
              ))}
            </nav>
            <span className="ml-auto text-xs text-mist">{wordCount(s.scenes.map((x) => x.text).join(" "))} words · {shown.title} · {relativeTime(shown.created_at)}</span>
          </div>
          {compareTo && <p className="mt-2 text-xs text-mist">Changes from v{compareTo.version} are highlighted: <ins className="bg-emerald-300/20 no-underline">added</ins> <del className="bg-rose-300/20">removed</del>.</p>}
          <div className="mt-4 space-y-6">
            {s.scenes.map((sc) => {
              const before = c?.scenes.find((x) => x.index === sc.index)?.text;
              const changed = before !== undefined && before !== sc.text;
              return (
                <article key={sc.index} className={cx("rounded-3xl border p-6", changed ? "border-lavender/40" : "border-white/10", "bg-[#0d1230]/60")}>
                  <h3 className="mb-3 text-xs uppercase tracking-[0.25em] text-lavender">Scene {sc.index} · {sc.title}{changed ? " · revised" : ""}</h3>
                  <div className="whitespace-pre-wrap font-serif text-[19px] leading-[1.75] text-white/90">
                    {changed ? wordDiff(before, sc.text).map((p, i) => (p.type === "same" ? <span key={i}>{p.text}</span> : p.type === "add" ? <ins key={i} className="rounded bg-emerald-300/20 no-underline">{p.text}</ins> : <del key={i} className="rounded bg-rose-300/15 text-white/50">{p.text}</del>)) : sc.text}
                  </div>
                </article>
              );
            })}
          </div>
          <details className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <summary className="cursor-pointer font-serif text-xl text-white">Edit this version</summary>
            <p className="mt-2 text-sm text-mist">Your edit is saved as a new version credited to you; agents work from it from then on.</p>
            <ScriptEditor deliverableId={shown.id} initial={s} />
          </details>
        </section>
      )}

      {briefs.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-3xl text-white">Editorial synthesis</h2>
          {briefs.map((b) => (
            <DeliverableCard key={b.id} d={b}>
              <p className="text-white/90">{(b.data as RevisionBrief).summary}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {(b.data as RevisionBrief).scene_instructions.map((si, idx) => (
                  <li key={`${si.scene_index}-${idx}`} className="rounded-xl bg-white/[0.03] p-3"><span className="text-lavender">Scene {si.scene_index}:</span> {si.instructions.join(" ")}</li>
                ))}
              </ul>
              {(b.data as RevisionBrief).dismissed_notes.length > 0 && <p className="mt-2 text-xs text-mist">Dismissed: {(b.data as RevisionBrief).dismissed_notes.join(" · ")}</p>}
            </DeliverableCard>
          ))}
        </section>
      )}

      {reviews.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-3xl text-white">Critiques</h2>
          <div className="grid gap-4 xl:grid-cols-2">{reviews.map((r) => <DeliverableCard key={r.id} d={r} />)}</div>
        </section>
      )}

      {others.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-3xl text-white">Production notes</h2>
          {others.map((d) => <DeliverableCard key={d.id} d={d} />)}
        </section>
      )}
    </div>
  );
}
