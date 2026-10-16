import { isStaff } from "../staff";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { SceneArt } from "@/components/art/SceneArt";
import { cx, formatDateTime, formatDuration, relativeTime } from "@/lib/util";
import { ReviewDecision } from "./ReviewDecision";

export const metadata = { title: "Review queue" };

const CHECK_LABEL: Record<string, string> = {
  audio: "Audio file",
  metadata: "Title & description",
  release: "Release time",
  series: "Series status",
  script: "Script",
  audio_qa: "Audio QA",
  artwork: "Artwork",
};

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (!(await isStaff())) return null;
  const { id } = await searchParams;
  const db = getDb();
  const [pending, decided, series, episodes, users, seasons] = await Promise.all([
    db.list("editorial_reviews", { where: { status: "pending" }, orderBy: { column: "created_at" } }),
    db.list("editorial_reviews", { where: { status: ["approved", "rejected", "changes_requested"] }, orderBy: { column: "decided_at", ascending: false }, limit: 8 }),
    db.list("series"),
    db.list("episodes"),
    db.list("users"),
    db.list("seasons"),
  ]);
  const selected = (id && [...pending, ...decided].find((r) => r.id === id)) || pending[0] || null;
  const ep = selected ? episodes.find((e) => e.id === selected.episode_id) : null;
  const s = ep ? series.find((x) => x.id === ep.series_id) : null;
  const audio = ep?.audio_asset_id ? await db.get("audio_assets", ep.audio_asset_id) : null;
  const uploader = selected ? users.find((u) => u.id === selected.submitted_by) : null;
  const script = ep ? await db.findOne("episode_scripts", { episode_id: ep.id }) : null;
  const byAgents = selected?.source === "agents";
  const seasonNo = ep ? seasons.find((x) => x.id === ep.season_id)?.number : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside aria-label="Review queue" className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="headline text-2xl">Queue <span className="text-mist">({pending.length})</span></h2>
            <Link href="/admin/episodes/new" className="text-xs text-lavender hover:underline">+ Add episode</Link>
          </div>
          <ul className="mt-3 space-y-2">
            {pending.map((r) => {
              const e = episodes.find((x) => x.id === r.episode_id);
              const ser = series.find((x) => x.id === r.series_id);
              const fails = r.checks.filter((c) => c.status === "fail").length;
              return (
                <li key={r.id}>
                  <Link href={`/admin/review?id=${r.id}`} className={cx("block rounded-2xl border p-3 text-sm", selected?.id === r.id ? "border-lavender bg-lavender/10" : "border-white/10 hover:bg-white/5")}>
                    <div className="text-xs text-mist">{ser?.title}</div>
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
            <span className={cx("relative h-36 overflow-hidden rounded-3xl ring-1 ring-white/10", ep.artwork_url ? "w-64" : "w-28")}>
              <SceneArt spec={ep.artwork_url ? { ...s.artwork, image_url: ep.artwork_url } : s.artwork} className="h-full w-full" title={`${ep.title} artwork`} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-mist">{s.title} · {s.is_official ? "Calm Original" : "Creator Original"} · {byAgents ? <span className="text-lavender">produced by the agents{uploader ? ` for ${uploader.display_name}` : ""}</span> : <>uploaded by {uploader?.display_name ?? "Calm"}</>}</p>
              <h2 className="headline text-4xl">Season {seasonNo} · Episode {ep.number}: {ep.title}</h2>
              <p className="mt-1 max-w-2xl text-sm text-mist">{ep.summary || "No description."}</p>
              <p className="mt-2 text-xs text-mist">Requested release: {selected.requested_release_at ? formatDateTime(selected.requested_release_at) : "not specified"} · Status: {selected.status.replace("_", " ")}</p>
            </div>
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <section aria-labelledby="audio-h" className="card p-5">
                <h3 id="audio-h" className="font-medium">Listen before approving</h3>
                {audio ? (
                  <>
                    <audio controls preload="none" src={`/api/admin/audio/${audio.id}`} className="mt-3 w-full" aria-label="Episode audio" />
                    <p className="mt-2 text-xs text-mist">
                      {formatDuration(audio.duration_seconds)} · {audio.mime_type}
                      {audio.kind === "sample" ? " · prototype ambience sample" : ""}
                      {audio.kind === "produced" ? (audio.meta.simulated ? " · placeholder voice (ElevenLabs not connected)" : " · narrated by ElevenLabs") : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-mist">No audio attached.</p>
                )}
              </section>
              {script && (
                <section aria-labelledby="script-h" className="card p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 id="script-h" className="font-medium">Script</h3>
                    <span className="text-xs text-mist">{script.word_count.toLocaleString()} words · {script.simulated ? "simulated (Claude not connected)" : script.model}</span>
                  </div>
                  {script.notes.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-mist">{script.notes.map((n, i) => <li key={i}>• {n}</li>)}</ul>
                  )}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-lavender">Read the script</summary>
                    <div className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-2xl bg-night/60 p-4 font-serif text-base leading-relaxed text-white/90">{script.content}</div>
                  </details>
                </section>
              )}
              <section aria-labelledby="checks-h" className="card p-5">
                <h3 id="checks-h" className="font-medium">Automated checks</h3>
                <p className="text-xs text-mist">These inform the editor – they never approve on their own.</p>
                <ul className="mt-3 grid gap-2 md:grid-cols-2">
                  {selected.checks.map((c, i) => (
                    <li key={i} className={cx("rounded-2xl px-3 py-2 text-sm", c.status === "fail" ? "bg-rose-400/10" : c.status === "warn" ? "bg-amber-300/10" : c.status === "pass" ? "bg-emerald-300/5" : "bg-white/5")}>
                      <div className="flex justify-between"><span className="font-medium">{CHECK_LABEL[c.name] ?? c.name}</span><span className="text-xs uppercase tracking-wider">{c.status.replace("_", " ")}</span></div>
                      <p className="mt-0.5 text-xs text-mist">{c.detail}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            {selected.status === "pending" ? (
              <ReviewDecision reviewId={selected.id} requested={selected.requested_release_at} hasAudio={Boolean(ep.audio_asset_id)} />
            ) : (
              <section className="card h-fit p-5 text-sm">
                <h3 className="font-medium">Decision: {selected.status.replace("_", " ")}</h3>
                {selected.notes && <p className="mt-1 text-xs text-mist">{selected.notes}</p>}
                {ep.release_at && <p className="mt-1 text-xs text-mist">Release: {formatDateTime(ep.release_at)}</p>}
              </section>
            )}
          </div>
        </article>
      ) : (
        <p className="text-mist">Select an item from the queue.</p>
      )}
    </div>
  );
}
