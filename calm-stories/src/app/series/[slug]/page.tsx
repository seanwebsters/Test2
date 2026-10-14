import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { getSeriesPage } from "@/lib/services/catalog";
import { Artwork } from "@/components/Artwork";
import { Avatar } from "@/components/Avatar";
import { FollowButton, PlayButton, SaveButton } from "@/components/actions";
import { EpisodeList } from "@/components/EpisodeList";
import { SeriesCard } from "@/components/SeriesCard";
import { Shelf } from "@/components/Shelf";
import { ReportButton } from "@/components/ReportButton";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getSeriesPage(await getViewer(), slug);
  return page ? { title: page.series.title, description: page.series.tagline } : { title: "Series not found" };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await getViewer();
  const page = await getSeriesPage(viewer, slug);
  if (!page) notFound();
  const { series, creator, seasons, resume, card } = page;
  const signedIn = !!viewer.user;
  const firstEp = seasons[0]?.episodes.find((e) => e.access !== "hidden");
  const firstLocked = firstEp?.access === "locked";

  return (
    <>
      <section className="relative isolate -mt-16 overflow-hidden pt-16">
        <div className="absolute inset-0 -z-10">
          <Artwork spec={series.artwork} variant="hero" title={series.title} />
          <div className="absolute inset-0 bg-gradient-to-r from-night via-night/75 to-night/10" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-night to-transparent" />
        </div>
        <div className="mx-auto max-w-screen-2xl px-4 pb-14 pt-28 sm:px-6 lg:px-10">
          {series.status !== "published" && (
            <p className="mb-4 inline-block rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-xs text-amber-100">
              {series.status === "draft" ? "Private draft — only you and Calm editors can see this" : `Status: ${series.status}`}
            </p>
          )}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lavender">
            {series.is_official ? "Calm Original" : "Creator Original"} · {series.genre}
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl font-semibold leading-none sm:text-7xl">{series.title}</h1>
          <p className="mt-5 max-w-2xl font-serif text-2xl italic text-white/85">{series.tagline}</p>
          <p className="mt-5 max-w-2xl leading-relaxed text-white/75">{series.description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {resume && resume.episodeId !== firstEp?.id ? (
              <>
                <PlayButton episodeId={resume.episodeId} label={`Continue: ${resume.episodeTitle}`} />
                <PlayButton episodeId={firstEp?.id ?? null} label="Start from the beginning" variant="ghost" fromStart locked={firstLocked} />
              </>
            ) : (
              <PlayButton episodeId={firstEp?.id ?? null} label="Play first episode" fromStart locked={firstLocked} />
            )}
            <SaveButton seriesId={series.id} initial={card.saved} signedIn={signedIn} />
            <FollowButton type="series" id={series.id} initial={page.following} signedIn={signedIn} label="Follow series" />
            {page.canEdit && (
              <Link href={`/studio/series/${series.id}`} className="rounded-full border border-white/20 px-5 py-3 text-sm text-white hover:bg-white/10">
                Manage in Studio
              </Link>
            )}
          </div>
          <p className="mt-4 text-xs text-mist">
            {page.followers} follower{page.followers === 1 ? "" : "s"} · {card.episodeCount} episodes available
            {!viewer.isPremium && " · The first episode is free to preview; the full series is included with Calm Premium."}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-screen-2xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_20rem] lg:px-10">
        <EpisodeList seasons={seasons} seriesTitle={series.title} />
        <aside className="space-y-6">
          {creator && (
            <div className="card-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-mist">{creator.is_official ? "From" : "Created by"}</p>
              <Link href={`/profile/${creator.username}`} className="mt-3 flex items-center gap-3 hover:text-lavender">
                <Avatar name={creator.display_name} hue={Number(/hsl\((\d+)/.exec(creator.avatar.palette[0])?.[1] ?? 240)} size={44} />
                <span className="font-medium">{creator.display_name}</span>
              </Link>
              <p className="mt-3 text-sm text-mist">{creator.bio}</p>
              {viewer.user?.id !== creator.user_id && (
                <div className="mt-4">
                  <FollowButton type="creator" id={creator.user_id} initial={page.followingCreator} signedIn={signedIn} label="Follow creator" size="sm" />
                </div>
              )}
            </div>
          )}
          {series.ai_disclosure && (
            <div className="rounded-2xl border border-white/10 p-4 text-xs leading-relaxed text-mist">
              <p className="font-semibold text-white/80">About this series</p>
              <p className="mt-1">{series.ai_disclosure} Community series pass Calm editorial review before release.</p>
            </div>
          )}
          <ReportButton targetType="series" targetId={series.id} signedIn={signedIn} />
        </aside>
      </div>

      {page.related.length > 0 && (
        <div className="mx-auto mt-14 max-w-screen-2xl">
          <Shelf title="You might also like">
            {page.related.map((c) => (
              <SeriesCard key={c.id} card={c} signedIn={signedIn} />
            ))}
          </Shelf>
        </div>
      )}
    </>
  );
}
