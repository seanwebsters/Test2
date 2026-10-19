import "server-only";
import { getDb } from "@/lib/db";
import type { Episode } from "@/lib/types";

export interface ApprovedStory {
  id: string;
  title: string;
  seriesTitle: string;
  description: string;
  coverUrl: string | null;
  audioUrl: string;
  durationSeconds: number;
  publishedAt: string;
}

/** Public origin for absolute links: PUBLIC_BASE_URL, else the proxy's forwarded host (Railway), else the Host header. */
export function publicBaseUrl(req: Request): string {
  const fixed = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (fixed) return fixed;
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto.split(",")[0]!.trim()}://${host.split(",")[0]!.trim()}`;
}

/**
 * A story is public once a human approved it and its release time has passed
 * (status "published" – agents can never publish) and it has produced audio.
 */
export function isPublicStory(ep: Pick<Episode, "status" | "published_at" | "audio_asset_id">, now = new Date()): boolean {
  return ep.status === "published" && Boolean(ep.audio_asset_id) && Boolean(ep.published_at) && new Date(ep.published_at!) <= now;
}

const absolute = (base: string, url: string | null | undefined) => (!url ? null : /^https?:\/\//.test(url) ? url : `${base}${url.startsWith("/") ? "" : "/"}${url}`);

export async function listApprovedStories(base: string, now = new Date()): Promise<ApprovedStory[]> {
  const db = getDb();
  const [episodes, series, assets] = await Promise.all([db.list("episodes", { where: { status: "published" } }), db.list("series"), db.list("audio_assets")]);
  return episodes
    .filter((ep) => isPublicStory(ep, now))
    .sort((a, b) => (a.published_at! < b.published_at! ? 1 : -1))
    .map((ep) => {
      const s = series.find((x) => x.id === ep.series_id);
      const asset = assets.find((a) => a.id === ep.audio_asset_id);
      return {
        id: ep.id,
        title: ep.title,
        seriesTitle: s?.title ?? "",
        description: ep.summary || s?.description || "",
        coverUrl: absolute(base, ep.artwork_url ?? s?.artwork.image_url ?? null),
        audioUrl: `${base}/api/approved-stories/${ep.id}/audio`,
        durationSeconds: Math.round(asset?.duration_seconds ?? ep.duration_seconds ?? 0),
        publishedAt: ep.published_at!,
      };
    });
}
