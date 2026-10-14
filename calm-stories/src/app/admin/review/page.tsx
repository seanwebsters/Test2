import Link from "next/link";
import { getDb } from "@/lib/db";
import { currentScriptText } from "@/lib/storymaker/scripts";
import { SceneArt } from "@/components/art/SceneArt";
import { cx, formatDateTime, formatDuration, relativeTime } from "@/lib/util";
import { ReviewDecision } from "./ReviewDecision";

export const metadata = { title: "Editorial review" };

const CHECK_LABEL: Record<string, string> = {
  content_safety: "Content safety",
  rights: "Rights & licensing",
  sleep_suitability: "Sleep suitability",
  continuity: "Continuity",
  audio_quality: "Audio quality",
  metadata: "Metadata",
  ai_disclosure: "AI disclosure",
};

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const db = getDb();
  const [pending, decided, series, episodes, users] = await Promise.all([
    db.list("editorial_reviews", { where: { status: "pending" }, orderBy: { column: "created_at" } }),
    db.list("editorial_reviews", { where: { status: ["approved", "rejected", "changes_requested"] }, orderBy: { column: "decided_at", ascending: false }, limit: 8 }),
    db.list("series"),
    db.list("episodes"),
    db.list("users"),
  ]);
  const selected = (id && [...pending, ...decided].find((r) => r.id === id)) || pending[0] || null;
  const ep = selected ? episodes.find((e) => e.id === selected.episode_id) : null;
  const s = ep ? series.find((x) => x.id === ep.series_id) : null;
  const script = ep ? await currentScriptText(ep.id) : null;
  const audio = ep?.audio_asset_id ? await db.get("audio_assets", ep.audio_asset_id) : null;
  const rights = s ? await db.findOne("rights_declarations", { series_id: s.id }) : null;
  const epArt = ep ? (await db.list("artwork_assets", { where: { episode_id: ep.id } }))[0] : null;
  const submitter = selected ? users.find((u) => u.id === selected.submitted_by) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside aria-label="Review queue" className="space-y-6">
        <div>
          <h2 className="headline text-2xl">Queue <span className="text-mist">({pending.length})</span></h2>
          <ul className="mt-3 space-y-2">
            {pending.map((r) => {
              const e = episodes.find((x) => x.id === r.episode_id);
              const ser = series.find((x) => x.id === r.series_id);
              const fails = r.checks.filter((c) => c.status === "fail").length;
              return (
                <li key={r.id}>
                  <Link href={`/admin/review?id=${r.id}`} className={cx("block rounded-2xl border p-3 text-sm", selected?.id === r.id ? "border-lavender bg-lavender/10" : "border-white/10 hover:bg-white/5")}>
                    <div className="text-xs text-mist">{ser?.title} · {r.source === "creator" ? "Community" : "Production engine"}</div>
                    <div className="font-medium">Ep {e?.number} · {e?.title}</div>
                    <div className="mt-1 text-[11px] text-mist">{relativeTime(r.created_at)}{fails ? <span className="text-rose-300"> · {fails} failing check(s)</span> : ""}</div>
                  </Link>
                </li>
              );
            })}
            {pending.length === 0 && <li className="text-sm text-mist">Nothing waiting for review.</li>}
          </ul>
        </div>
        {decided.length > 0 && (
          <div>
            <h3 className="label">Recently decided</h3>
            <ul className="space-y-1 text-xs">
              {decided.map((r) => {
                const e = episodes.find((x) => x.id === r.episode_id);
                return <li key={r.id}><Link href={`/admin/review?id=${r.id}`} className="flex justify-between rounded-xl px-2 py-1.5 hover:bg-white/5"><span className="truncate">{e?.title}</span><span className="text-mist">{r.status.replace("_", " ")}</span></Link></li>;
              })}
            </ul>
          </div>
        )}
      </aside>

      {selected && ep && s ? (
        <article className="space-y-6">
          <div className="flex flex-wrap items-center gap-5">
            <span className="relative h-36 w-28 overflow-hidden rounded-3xl ring-1 ring-white/10"><SceneArt spec={epArt?.spec ?? s.artwork} className="h-full w-full" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-mist">{s.title} · {s.is_official ? "Calm Original" : "Creator Original"} · submitted by {submitter?.display_name ?? "Production engine"}</p>
              <h2 className="headline text-4xl">Episode {ep.number}: {ep.title}</h2>
              <p className="mt-1 max-w-2xl text-sm text-mist">{ep.summary}</p>
              <p className="mt-2 text-xs text-mist">Requested release: {selected.requested_release_at ? formatDateTime(selected.requested_release_at) : "not specified"} · Status: {selected.status.replace("_", " ")}</p>
            </div>
          </div>

          <section aria-labelledby="checks-h" className="card p-5">
            <h3 id="checks-h" className="font-medium">Safety, rights & quality checks</h3>
            <p className="text-xs text-mist">Automated screening informs the editor – it never approves on its own.</p>
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              {selected.checks.map((c, i) => (
                <li key={i} className={cx("rounded-2xl px-3 py-2 text-sm", c.status === "fail" ? "bg-rose-400/10" : c.status === "warn" ? "bg-amber-300/10" : c.status === "pass" ? "bg-emerald-300/5" : "bg-white/5")}>
                  <div className="flex justify-between"><span className="font-medium">{CHECK_LABEL[c.name] ?? c.name}</span><span className="text-xs uppercase tracking-wider">{c.status.replace("_", " ")}</span></div>
                  <p className="mt-0.5 text-xs text-mist">{c.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section aria-labelledby="script-h" className="card p-5">
              <div className="flex items-center justify-between">
                <h3 id="script-h" className="font-medium">Script {script && <span className="text-xs text-mist">v{script.version.version} · {script.version.word_count.toLocaleString()} words{script.version.simulated ? " · simulated" : ""}</span>}</h3>
                <Link href={`/studio/series/${s.id}/episodes/${ep.id}`} className="text-xs text-lavender hover:underline">Open in editor</Link>
              </div>
              <div className="mt-3 max-h-[60vh] overflow-y-auto rounded-2xl bg-night/60 p-5 font-serif text-[1.05rem] leading-relaxed text-white/90">
                {script ? script.version.content.split(/\n\s*\n/).map((p, i) => <p key={i} className="mb-4">{p}</p>) : <p className="text-mist">No script.</p>}
              </div>
            </section>
            <div className="space-y-6">
              <section aria-labelledby="audio-h" className="card p-5">
                <h3 id="audio-h" className="font-medium">Narration & mix</h3>
                {audio ? (
                  <>
                    <audio controls preload="none" src={audio.kind === "sample" ? audio.url : `/api/studio/audio/${audio.id}`} className="mt-3 w-full" aria-label="Episode audio" />
                    <p className="mt-2 text-xs text-mist">{formatDuration(audio.duration_seconds)} · {audio.kind}{audio.simulated && audio.kind !== "sample" ? " · simulated narration" : ""}</p>
                    {audio.qa && <p className="mt-1 text-xs text-mist">≈{audio.qa.integrated_loudness_approx_lufs} LUFS · peak {audio.qa.peak_dbfs} dBFS · {audio.qa.passed ? "QA passed" : "QA issues"}</p>}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-mist">No audio attached.</p>
                )}
              </section>
              <section aria-labelledby="rights-h" className="card p-5 text-sm">
                <h3 id="rights-h" className="font-medium">Rights & disclosure</h3>
                {rights ? (
                  <ul className="mt-2 space-y-1 text-xs text-mist">
                    <li>Original work: {rights.original_work ? "Yes" : "No"}</li>
                    <li>AI-assisted: {rights.ai_assisted ? "Yes" : "No"}</li>
                    <li>Third-party material: {rights.third_party_material}</li>
                    <li>Voice consent: {rights.voice_consent ? "Confirmed" : "Missing"}</li>
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-mist">{s.is_official ? "Calm Original – rights held by Calm." : "No declaration on file."}</p>
                )}
                {s.ai_disclosure && <p className="mt-2 text-xs text-mist">Listener disclosure: “{s.ai_disclosure}”</p>}
              </section>
              {selected.status === "pending" ? (
                <ReviewDecision reviewId={selected.id} requested={selected.requested_release_at} hasAudio={Boolean(ep.audio_asset_id)} />
              ) : (
                <section className="card p-5 text-sm">
                  <h3 className="font-medium">Decision: {selected.status.replace("_", " ")}</h3>
                  <p className="mt-1 text-xs text-mist">{selected.notes}</p>
                  {ep.release_at && <p className="mt-1 text-xs text-mist">Release: {formatDateTime(ep.release_at)}</p>}
                </section>
              )}
            </div>
          </div>
        </article>
      ) : (
        <p className="text-mist">Select an item from the queue.</p>
      )}
    </div>
  );
}
