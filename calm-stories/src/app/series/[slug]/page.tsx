import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { canUseLibrary } from "@/lib/auth/policy";
import { getSeriesDetail } from "@/lib/services/catalog";
import { SceneArt } from "@/components/art/SceneArt";
import { PlayButton } from "@/components/catalog/PlayButton";
import { ToggleAction } from "@/components/catalog/ToggleAction";
import { SeriesCard } from "@/components/catalog/SeriesCard";
import { ShelfScroller } from "@/components/catalog/Shelf";
import { Avatar } from "@/components/ui/Avatar";
import { ReportButton } from "@/components/ui/ReportButton";
import { SeasonEpisodes } from "./SeasonEpisodes";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getSeriesDetail(slug, await getViewer());
  return { title: detail?.series.title ?? "Series" };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await getViewer();
  const d = await getSeriesDetail(slug, viewer);
  if (!d) notFound();
  const { series, creator } = d;
  const canSave = canUseLibrary(viewer);
  const firstEp = d.seasons[0]?.episodes.find((e) => e.is_public) ?? d.seasons[0]?.episodes[0];
  const totalEpisodes = d.seasons.reduce((n, s) => n + s.episodes.filter((e) => e.is_public).length, 0);

  return (
    <>
      <section className="relative isolate overflow-hidden pb-14 pt-36">
        <SceneArt spec={series.artwork} className="absolute inset-0 -z-10 h-full w-full" title={`${series.title} key art`} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-night via-night/70 to-night/10" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-night to-transparent" />
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
          {!d.is_public && (
            <p className="mb-4 inline-block rounded-full bg-amber-300/15 px-3 py-1 text-xs text-amber-200">Private preview · not yet published</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{series.genre}</span>
            <span className="chip">{series.is_official ? "Calm Original" : "Creator Original"}</span>
            <span className="chip">{totalEpisodes} episodes</span>
          </div>
          <h1 className="headline mt-5 max-w-3xl text-5xl leading-[0.95] sm:text-7xl">{series.title}</h1>
          <p className="mt-4 max-w-2xl font-serif text-2xl italic text-white/90">{series.tagline}</p>
          <p className="mt-5 max-w-2xl text-mist">{series.description}</p>
          {series.ai_disclosure && <p className="mt-3 max-w-2xl text-xs text-mist/80">AI disclosure: {series.ai_disclosure}</p>}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {d.resume ? (
              <>
                <PlayButton episodeId={d.resume.episode_id} startAt={d.resume.position_seconds} label={d.resume.label} variant="accent" />
                <PlayButton episodeId={firstEp?.id ?? null} startAt={0} label="Start from the beginning" variant="ghost" />
              </>
            ) : (
              <PlayButton episodeId={firstEp?.id ?? null} startAt={0} label="Play Episode 1" variant="accent" />
            )}
            <ToggleAction endpoint="/api/library/save" payload={{ series_id: series.id }} initial={d.saved} onLabel="Saved" offLabel="Save to library" icon="bookmark" allowed={canSave && d.is_public} />
            <ToggleAction endpoint="/api/library/follow-series" payload={{ series_id: series.id }} initial={d.following} onLabel="Following" offLabel="Follow series" icon="bell" allowed={canSave && d.is_public} />
          </div>

          {creator && (
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href={`/profile/${creator.username}`} className="flex items-center gap-3">
                <Avatar name={creator.display_name} hue={Number(/\d+/.exec(creator.avatar.palette[0])?.[0] ?? 240)} size={44} />
                <div>
                  <div className="text-xs uppercase tracking-wider text-mist">Created by</div>
                  <div className="font-medium hover:underline">{creator.display_name}</div>
                </div>
              </Link>
              {viewer.user?.id !== creator.user_id && (
                <ToggleAction
                  endpoint="/api/library/follow-creator"
                  payload={{ creator_id: creator.user_id }}
                  initial={d.following_creator}
                  onLabel="Following creator"
                  offLabel="Follow creator"
                  icon="plus"
                  allowed={canSave}
                  className="btn-sm"
                />
              )}
              <span className="text-sm text-mist">{d.follower_count.toLocaleString()} followers</span>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <SeasonEpisodes
          seasons={d.seasons.map((s) => ({
            id: s.id,
            number: s.number,
            title: s.title,
            synopsis: s.synopsis,
            episodes: s.episodes.map((e) => ({
              id: e.id,
              number: e.number,
              title: e.title,
              summary: e.summary,
              duration_seconds: e.duration_seconds,
              is_preview: e.is_preview,
              is_public: e.is_public,
              status: e.status,
              release_at: e.release_at,
              progress: e.progress ? { position: e.progress.position_seconds, duration: e.progress.duration_seconds, completed: e.progress.completed } : null,
            })),
          }))}
          premium={canSave}
        />
        <div className="mt-6 flex justify-end">
          <ReportButton targetType="series" targetId={series.id} />
        </div>
      </section>

      {d.related.length > 0 && (
        <div className="mt-16">
          <ShelfScroller id="related" title="You might also like">
            {d.related.map((c) => (
              <div role="listitem" key={c.id}>
                <SeriesCard card={c} canSave={canSave} />
              </div>
            ))}
          </ShelfScroller>
        </div>
      )}
    </>
  );
}
