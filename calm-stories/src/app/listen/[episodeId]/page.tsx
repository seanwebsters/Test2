import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { canStreamEpisode } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { getPlayableEpisode } from "@/lib/services/catalog";
import { getProgress } from "@/lib/services/library";
import { SceneArt } from "@/components/art/SceneArt";
import { ListenView } from "./ListenView";

export async function generateMetadata({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params;
  const ep = await getPlayableEpisode(episodeId, await getViewer());
  return { title: ep ? `${ep.title} – ${ep.series_title}` : "Listen" };
}

export default async function ListenPage({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params;
  const viewer = await getViewer();
  const ep = await getPlayableEpisode(episodeId, viewer);
  if (!ep) notFound();
  const db = getDb();
  const [raw, series] = await Promise.all([db.get("episodes", episodeId), db.get("series", ep.series_id)]);
  if (!raw || !series) notFound();
  const access = canStreamEpisode(viewer, raw, series);
  const progress = await getProgress(viewer, episodeId);
  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <SceneArt spec={ep.artwork} className="absolute inset-0 -z-20 h-full w-full scale-110 blur-2xl" />
      <div className="absolute inset-0 -z-10 bg-night/75" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-28 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[2.5rem] shadow-2xl ring-1 ring-white/15">
          <SceneArt spec={ep.artwork} className="h-full w-full" title={`${ep.series_title} artwork`} />
        </div>
        <div>
          <Link href={`/series/${ep.series_slug}`} className="text-sm uppercase tracking-wider text-lavender hover:underline">
            {ep.series_title}
          </Link>
          <p className="mt-2 text-sm text-mist">
            Season {ep.season_number} · Episode {ep.number} · by {ep.creator_name}
          </p>
          <h1 className="headline mt-3 text-5xl leading-[0.95] sm:text-6xl">{ep.title}</h1>
          <p className="mt-5 text-mist">{ep.summary}</p>
          <ListenView
            episodeId={ep.id}
            allowed={access.allowed}
            hasAudio={ep.has_audio}
            isSample={ep.audio_is_sample}
            simulated={ep.audio_simulated}
            resumeAt={progress && !progress.completed ? progress.position_seconds : null}
            isPublic={ep.is_public}
          />
        </div>
      </div>
    </div>
  );
}
