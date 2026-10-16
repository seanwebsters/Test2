import Link from "next/link";
import { getDb } from "@/lib/db";
import { AdminAction } from "@/components/admin/AdminAction";
import { providerStatus } from "@/lib/studio/providers";
import type { AudioDirection } from "@/lib/studio/schemas";
import type { AudioQaReport } from "@/lib/types";
import { cx, formatDuration } from "@/lib/util";
import { isStaff } from "@/app/admin/staff";
import { PronunciationEditor } from "./PronunciationEditor";

export const metadata = { title: "Audio Studio" };

export default async function AudioStudio({ searchParams }: { searchParams: Promise<{ series?: string }> }) {
  if (!(await isStaff())) return null;
  const { series: sel } = await searchParams;
  const db = getDb();
  const projects = await db.list("series_projects");
  const ids = projects.map((p) => p.series_id).filter(Boolean) as string[];
  const series = ids.length ? await db.list("series", { where: { id: ids } }) : [];
  const current = series.find((s) => s.id === sel) ?? series[0];
  const eleven = providerStatus().find((p) => p.key === "ELEVENLABS_API_KEY")!;
  const [auditions, chars, pron, episodes, renders] = current
    ? await Promise.all([
        db.list("voice_auditions", { where: { series_id: current.id } }),
        db.list("characters", { where: { series_id: current.id } }),
        db.list("pronunciations", { where: { series_id: current.id } }),
        db.list("episodes", { where: { series_id: current.id } }),
        db.list("scene_renders", { where: { series_id: current.id, status: "current" } }),
      ])
    : [[], [], [], [], []];
  const roles = [{ id: null as string | null, name: "Narrator" }, ...chars.map((c) => ({ id: c.id as string | null, name: c.name }))];
  const produced = episodes.filter((e) => renders.some((r) => r.episode_id === e.id)).sort((a, b) => b.number - a.number);
  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-5xl text-white">Audio Studio</h1>
        {!eleven.connected && <p className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-3 text-sm text-amber-100">Connect <code>ELEVENLABS_API_KEY</code> to audition voices, narrate, and generate sound and music. Only voices in your ElevenLabs account (which you hold rights to use) are offered for casting.</p>}
      </header>
      <nav className="flex flex-wrap gap-2">{series.map((s) => <Link key={s.id} href={`?series=${s.id}`} className={cx("rounded-full px-3 py-1.5 text-sm", s.id === current?.id ? "bg-white text-night" : "bg-white/5 text-mist")}>{s.title}</Link>)}</nav>
      {!current && <p className="text-mist">No studio series yet.</p>}
      {current && (
        <>
          <section>
            <h2 className="font-serif text-3xl text-white">Casting</h2>
            <p className="text-sm text-mist">The Audio Director auditions voices from your ElevenLabs library for each role. Listen and recast any role – new episodes use your choice.</p>
            <ul className="mt-4 grid gap-4 lg:grid-cols-2">
              {roles.map((role) => {
                const list = auditions.filter((a) => a.character_id === role.id);
                return (
                  <li key={role.id ?? "narrator"} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <h3 className="font-serif text-2xl text-white">{role.name}</h3>
                    <ul className="mt-2 space-y-2">
                      {list.map((a) => (
                        <li key={a.id} className={cx("rounded-2xl p-3", a.selected ? "bg-lavender/10 ring-1 ring-lavender/50" : "bg-white/[0.03]")}>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-white">{a.voice_name}</span>
                            {a.selected ? <span className="text-xs text-lavender">Cast</span> : <AdminAction endpoint={`/api/studio/auditions/${a.id}`} label="Cast this voice" className="btn-ghost btn-sm" />}
                          </div>
                          <p className="mt-1 text-xs text-mist">{a.rationale}</p>
                          {a.sample_key && <audio controls preload="none" src={`/api/studio/auditions/${a.id}`} className="mt-2 h-9 w-full" aria-label={`${a.voice_name} audition`} />}
                        </li>
                      ))}
                      {!list.length && <li className="text-sm text-mist">Not cast yet.</li>}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-serif text-3xl text-white">Pronunciation dictionary</h2>
            <p className="text-sm text-mist">Applied to every narration request so invented names are read the same way in every episode.</p>
            <PronunciationEditor seriesId={current.id} initial={pron.map((p) => ({ term: p.term, alias: p.alias, notes: p.notes }))} />
          </section>

          <section className="space-y-6">
            <h2 className="font-serif text-3xl text-white">Episodes</h2>
            {produced.map((ep) => {
              const scenes = renders.filter((r) => r.episode_id === ep.id).sort((a, b) => a.scene_index - b.scene_index);
              return (
                <article key={ep.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h3 className="font-serif text-2xl text-white">Ep {ep.number}: {ep.title}</h3>
                    <span className="text-xs text-mist">{ep.status.replace("_", " ")} · {formatDuration(ep.duration_seconds)}</span>
                  </div>
                  {ep.audio_asset_id && (
                    <div className="mt-3">
                      <div className="label">Mastered episode</div>
                      <audio controls preload="none" src={`/api/admin/audio/${ep.audio_asset_id}`} className="w-full" aria-label="Mastered episode" />
                    </div>
                  )}
                  <ol className="mt-4 grid gap-3 md:grid-cols-2">
                    {scenes.map((r) => {
                      const plan = r.plan as AudioDirection["scenes"][number];
                      const qa = r.qa as AudioQaReport;
                      return (
                        <li key={r.id} className="rounded-2xl bg-white/[0.03] p-3 text-sm">
                          <div className="flex items-center justify-between"><span className="text-white">Scene {r.scene_index} · v{r.version}</span><span className="text-xs text-mist">{formatDuration(r.duration_seconds)}</span></div>
                          <audio controls preload="none" src={`/api/studio/renders/${r.id}`} className="mt-2 h-9 w-full" aria-label={`Scene ${r.scene_index} stem`} />
                          <p className="mt-2 text-xs text-mist">Ambience: {plan?.ambience_layers.map((l) => `${l.prompt} (${l.level_db} dB)`).join("; ")}</p>
                          {plan?.music_cue && <p className="text-xs text-mist">Music: {plan.music_cue.prompt}</p>}
                          <p className={cx("mt-1 text-xs", qa?.passed ? "text-emerald-200/90" : "text-amber-200")}>QA: {qa?.issues?.filter((i) => i.severity !== "pass").map((i) => i.message).join(" ") || "all checks passed"}</p>
                          <div className="mt-2 flex gap-1.5">
                            <AdminAction endpoint="/api/studio/revoice" body={{ episode_id: ep.id, scene_index: r.scene_index, mode: "revoice" }} label="Re-voice scene" className="btn-ghost btn-sm" />
                            <AdminAction endpoint="/api/studio/revoice" body={{ episode_id: ep.id, scene_index: r.scene_index, mode: "remix" }} label="Regenerate sound" className="btn-ghost btn-sm" />
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </article>
              );
            })}
            {!produced.length && <p className="text-mist">No episodes have reached audio production yet.</p>}
          </section>
        </>
      )}
    </div>
  );
}
