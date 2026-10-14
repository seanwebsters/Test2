import "server-only";
import { getDb } from "@/lib/db";
import type { Viewer } from "@/lib/auth/policy";
import { canEditSeries } from "@/lib/auth/policy";
import { forbidden, notFound } from "@/lib/errors";
import { resolveWriter, providerStatus } from "@/lib/ai";
import { imageProviderStatus } from "@/lib/media/images";
import { episodeOrder } from "@/lib/services/catalog";

export async function loadWorkspace(viewer: Viewer, seriesId: string) {
  const db = getDb();
  const series = await db.get("series", seriesId);
  if (!series) throw notFound("Series not found.");
  if (!canEditSeries(viewer, series)) throw forbidden("You can only open your own series in Storymaker.");
  const [bible, characters, relationships, locations, seasons, episodes, scripts, artworks, rights, reviews, events, productions, voices, soundscapes] = await Promise.all([
    db.findOne("story_bibles", { series_id: seriesId }),
    db.list("characters", { where: { series_id: seriesId }, orderBy: { column: "created_at" } }),
    db.list("character_relationships", { where: { series_id: seriesId } }),
    db.list("locations", { where: { series_id: seriesId } }),
    db.list("seasons", { where: { series_id: seriesId }, orderBy: { column: "number" } }),
    db.list("episodes", { where: { series_id: seriesId } }),
    db.list("scripts", { where: { series_id: seriesId } }),
    db.list("artwork_assets", { where: { series_id: seriesId }, orderBy: { column: "created_at", ascending: false } }),
    db.findOne("rights_declarations", { series_id: seriesId }),
    db.list("editorial_reviews", { where: { series_id: seriesId }, orderBy: { column: "created_at", ascending: false } }),
    db.list("narrative_events", { where: { series_id: seriesId }, orderBy: { column: "created_at", ascending: false } }),
    db.list("episode_productions", { where: { series_id: seriesId } }),
    db.list("voice_profiles", { where: { approved: true } }),
    db.list("soundscapes"),
  ]);
  episodes.sort((a, b) => episodeOrder(a, b, seasons));
  const scriptByEp = new Map(scripts.map((s) => [s.episode_id, s]));
  const versions = await db.list("script_versions", { where: { script_id: scripts.map((s) => s.id) } });
  const assetIds = episodes.map((e) => e.audio_asset_id).filter((x): x is string => Boolean(x));
  const assets = assetIds.length ? await db.list("audio_assets", { where: { id: assetIds } }) : [];
  const writer = await resolveWriter("assistant");
  return {
    series,
    bible,
    characters,
    relationships,
    locations,
    seasons,
    episodes: episodes.map((e) => {
      const s = scriptByEp.get(e.id);
      const vs = s ? versions.filter((v) => v.script_id === s.id) : [];
      const cur = vs.find((v) => v.id === s?.current_version_id);
      const asset = assets.find((a) => a.id === e.audio_asset_id);
      return {
        ...e,
        has_script: Boolean(cur),
        word_count: cur?.word_count ?? 0,
        version_count: vs.length,
        script_simulated: cur?.simulated ?? false,
        audio: asset ? { id: asset.id, kind: asset.kind, duration_seconds: asset.duration_seconds, simulated: asset.simulated, qa_passed: asset.qa?.passed ?? null } : null,
        review: reviews.find((r) => r.episode_id === e.id) ?? null,
      };
    }),
    artworks,
    rights,
    events: events.slice(0, 30),
    productions,
    voices,
    soundscapes,
    engine: { provider: writer.providerName, model: writer.model, simulated: writer.simulated, providers: providerStatus(), image: imageProviderStatus() },
  };
}

export type Workspace = Awaited<ReturnType<typeof loadWorkspace>>;

export async function loadScript(viewer: Viewer, episodeId: string) {
  const db = getDb();
  const ep = await db.get("episodes", episodeId);
  if (!ep) throw notFound();
  const series = await db.get("series", ep.series_id);
  if (!series || !canEditSeries(viewer, series)) throw forbidden();
  const script = await db.findOne("scripts", { episode_id: ep.id });
  const versions = script ? await db.list("script_versions", { where: { script_id: script.id }, orderBy: { column: "version", ascending: false } }) : [];
  const current = versions.find((v) => v.id === script?.current_version_id) ?? null;
  return {
    episode: ep,
    script,
    current,
    versions: versions.map(({ content: _c, ...v }) => v),
  };
}
