import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { studioEpisode } from "@/lib/studio";
import { formatDateTime, formatDuration, relativeTime } from "@/lib/util";
import { SampleBadge, Stat } from "@/components/studio/charts";
import { StatusPill } from "@/components/storymaker/ui";

async function load(id: string, episodeId: string) {
  try {
    return await studioEpisode(await getViewer(), id, episodeId);
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 404 || status === 403) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; episodeId: string }> }) {
  const { id, episodeId } = await params;
  return { title: (await load(id, episodeId)).episode.title };
}

const SOURCE: Record<string, string> = { ai: "AI draft", human: "Your edit", ai_rewrite: "AI rewrite", agent: "Production agent" };

export default async function StudioEpisodePage({ params }: { params: Promise<{ id: string; episodeId: string }> }) {
  const { id, episodeId } = await params;
  const d = await load(id, episodeId);
  const e = d.episode;
  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-mist">
        <Link href="/studio" className="hover:text-white">My series</Link> / <Link href={`/studio/series/${d.series.id}`} className="hover:text-white">{d.series.title}</Link> / Episode {e.number}
      </nav>
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-4xl font-semibold">{e.title}</h1>
          <StatusPill status={e.status} />
        </div>
        <p className="mt-1 max-w-3xl text-sm text-mist">{e.summary}</p>
        <p className="mt-1 text-xs text-mist">
          {e.published_at ? `Published ${formatDateTime(e.published_at)}` : d.releaseAt ? `Scheduled for ${formatDateTime(d.releaseAt)}` : "Not scheduled"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href={`/create?series=${d.series.id}&episode=${e.id}`} className="rounded-full bg-white px-4 py-2 font-semibold text-night">Open in Storymaker</Link>
          {e.audio_asset_id && <Link href={`/listen/${e.id}`} className="rounded-full border border-white/15 px-4 py-2 hover:border-lavender/60">{e.status === "published" ? "Listen" : "Preview draft"}</Link>}
        </div>
      </header>

      <section aria-labelledby="st">
        <div className="flex items-center gap-2">
          <h2 id="st" className="font-serif text-2xl font-semibold">Listening</h2>
          <SampleBadge show={d.stats.includesSample} />
        </div>
        {e.status === "published" ? (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Plays" value={d.stats.plays.toLocaleString()} />
              <Stat label="Listeners" value={d.stats.listeners.toLocaleString()} />
              <Stat label="Hours listened" value={d.stats.listenedHours.toFixed(1)} />
              <Stat label="Completion" value={`${Math.round(d.stats.completionRate * 100)}%`} />
            </dl>
            <div className="card-surface mt-3 p-4">
              <h3 className="text-sm font-semibold">How far listeners get</h3>
              <p className="text-xs text-mist">Falling asleep before the end is a good outcome for a Sleep Story.</p>
              <ul className="mt-3 space-y-2">
                {d.retention.map((r) => (
                  <li key={r.at} className="flex items-center gap-3 text-xs">
                    <span className="w-16 text-mist">{r.at === 1 ? "The end" : `${r.at * 100}%`}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10" role="meter" aria-label={`Reached ${r.at * 100}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.share * 100)}>
                      <span className="block h-full bg-lavender/70" style={{ width: `${r.share * 100}%` }} />
                    </span>
                    <span className="w-10 text-right">{Math.round(r.share * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-mist">Listening figures appear once the episode is published.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-5" aria-labelledby="rv">
          <h2 id="rv" className="font-serif text-xl font-semibold">Editorial review</h2>
          <ul className="mt-2 divide-y divide-white/5 text-sm">
            {d.reviews.map((r) => (
              <li key={r.id} className="py-2">
                <div className="flex items-center gap-2"><StatusPill status={r.status} /><span className="text-xs text-mist">{relativeTime(r.decided_at ?? r.created_at)}</span></div>
                {r.notes && r.status !== "pending" && <p className="mt-1 text-sm">“{r.notes}”</p>}
                <p className="mt-1 text-[11px] text-mist">{r.checks.filter((c) => c.status === "pass").length}/{r.checks.length} automated checks passed</p>
              </li>
            ))}
            {!d.reviews.length && <li className="py-2 text-mist">Not submitted yet.</li>}
          </ul>
        </section>
        <section className="card-surface p-5" aria-labelledby="au">
          <h2 id="au" className="font-serif text-xl font-semibold">Audio</h2>
          {d.audio ? (
            <>
              <audio controls preload="none" src={`/api/audio/asset/${d.audio.id}`} className="mt-3 w-full" aria-label={`Mix of ${e.title}`} />
              <p className="mt-1 text-xs text-mist">
                {formatDuration(d.audio.duration)} · {d.sections} narration sections{d.audio.simulated && " · simulated narrator (placeholder audio)"}
              </p>
              {d.audio.qa && <p className="mt-1 text-xs text-mist">QA {d.audio.qa.passed ? "passed" : "failed"} · peak {d.audio.qa.peak_dbfs} dBFS · approx. {d.audio.qa.integrated_loudness_approx_lufs} LUFS</p>}
            </>
          ) : (
            <p className="mt-2 text-sm text-mist">No mix yet. Generate narration in Storymaker’s Audio stage.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="vh">
        <h2 id="vh" className="font-serif text-2xl font-semibold">Script history</h2>
        <ul className="mt-3 divide-y divide-white/5 text-sm">
          {d.versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
              <span className="font-medium">Version {v.version}</span>
              {v.current && <span className="rounded-full bg-lavender/20 px-2 py-0.5 text-[10px] text-lavender">Current</span>}
              <span className="text-xs text-mist">{SOURCE[v.source] ?? v.source}{v.simulated ? " (simulated)" : v.model ? ` · ${v.model}` : ""}</span>
              <span className="text-xs text-mist">{v.words.toLocaleString()} words · {relativeTime(v.createdAt)}</span>
              {v.note && <span className="w-full text-xs text-mist">{v.note}</span>}
            </li>
          ))}
          {!d.versions.length && <li className="py-2 text-mist">No script yet.</li>}
        </ul>
      </section>
    </div>
  );
}
