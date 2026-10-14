import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { getPlayerTrack } from "@/lib/services/catalog";
import { getDb } from "@/lib/db";
import { ListenView } from "@/components/player/ListenView";
import { ReportButton } from "@/components/ReportButton";

export async function generateMetadata({ params }: { params: Promise<{ episodeId: string }> }): Promise<Metadata> {
  const { episodeId } = await params;
  const t = await getPlayerTrack(await getViewer(), episodeId);
  return { title: t ? `${t.title} — ${t.seriesTitle}` : "Episode" };
}

export default async function ListenPage({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params;
  const viewer = await getViewer();
  const track = await getPlayerTrack(viewer, episodeId);
  if (!track) notFound();
  const db = getDb();
  const ep = await db.get("episodes", episodeId);
  const next = track.nextEpisodeId ? await db.get("episodes", track.nextEpisodeId) : null;
  const published = ep?.status === "published";
  return (
    <ListenView
      track={track}
      summary={ep?.summary ?? ""}
      nextTitle={next?.title ?? null}
      isPremium={viewer.isPremium}
      draftStatus={published ? null : (ep?.status ?? "draft")}
      extra={published ? <ReportButton targetType="episode" targetId={episodeId} signedIn={!!viewer.user} /> : null}
    />
  );
}
