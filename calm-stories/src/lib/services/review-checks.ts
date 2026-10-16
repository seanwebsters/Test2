import "server-only";
import { getDb } from "@/lib/db";
import type { ReviewCheck } from "@/lib/types";

/** Automated pre-review checks shown to editors. They inform, they never approve. */
export async function computeReviewChecks(episodeId: string, requestedReleaseAt: string | null): Promise<ReviewCheck[]> {
  const db = getDb();
  const ep = await db.get("episodes", episodeId);
  if (!ep) return [];
  const [series, asset, siblings] = await Promise.all([
    db.get("series", ep.series_id),
    ep.audio_asset_id ? db.get("audio_assets", ep.audio_asset_id) : Promise.resolve(null),
    db.list("episodes", { where: { series_id: ep.series_id, season_id: ep.season_id } }),
  ]);
  const checks: ReviewCheck[] = [];
  checks.push(
    !asset
      ? { name: "audio", status: "fail", detail: "No audio file attached." }
      : asset.duration_seconds < 120
        ? { name: "audio", status: "warn", detail: `Audio is only ${Math.round(asset.duration_seconds)} seconds long.` }
        : { name: "audio", status: "pass", detail: `${Math.round(asset.duration_seconds / 60)} min ${asset.mime_type.replace("audio/", "").toUpperCase()} file.` },
  );
  const dupNumber = siblings.some((s) => s.id !== ep.id && s.number === ep.number);
  checks.push(
    ep.title.trim().length < 3 || ep.summary.trim().length < 20
      ? { name: "metadata", status: "warn", detail: "Add a clear title and a description of at least a sentence." }
      : dupNumber
        ? { name: "metadata", status: "warn", detail: `Another episode in this season is already number ${ep.number}.` }
        : { name: "metadata", status: "pass", detail: "Title, description and numbering look good." },
  );
  checks.push(
    !requestedReleaseAt
      ? { name: "release", status: "warn", detail: "No release time requested – choose one when approving." }
      : new Date(requestedReleaseAt) < new Date()
        ? { name: "release", status: "warn", detail: "Requested release time is in the past – it will go live on approval." }
        : { name: "release", status: "pass", detail: `Requested for ${new Date(requestedReleaseAt).toUTCString()}.` },
  );
  checks.push(
    series?.status === "published"
      ? { name: "series", status: "pass", detail: "Series is live." }
      : { name: "series", status: "warn", detail: "Series isn't public yet – approving this episode will publish it." },
  );
  return checks;
}
