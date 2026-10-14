import { route } from "@/lib/api";
import { requireCreator } from "@/lib/auth/session";
import { canEditSeries } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";
import { getProduction, getTts, layersFor, scriptSections } from "@/lib/production/audio";
import { currentScriptText } from "@/lib/storymaker/scripts";
import { jobProgress } from "@/lib/jobs/runner";

export const GET = route<{ params: Promise<{ episodeId: string }> }>(async (_req, { params }) => {
  const { episodeId } = await params;
  const viewer = await requireCreator();
  const db = getDb();
  const ep = await db.get("episodes", episodeId);
  if (!ep) throw notFound();
  const series = await db.get("series", ep.series_id);
  if (!series || !canEditSeries(viewer, series)) throw forbidden();
  const prod = await getProduction(ep.id);
  const hasScript = Boolean(await currentScriptText(ep.id));
  const sections = hasScript ? (await scriptSections(ep.id)).sections : [];
  const sectionAssets = await Promise.all(prod.section_asset_ids.map((id) => (id ? db.get("audio_assets", id) : Promise.resolve(null))));
  const mix = prod.mix_asset_id ? await db.get("audio_assets", prod.mix_asset_id) : null;
  const jobs = (await db.list("ai_production_jobs", { where: { episode_id: ep.id }, orderBy: { column: "created_at", ascending: false }, limit: 5 })).map((j) => ({ ...j, progress: jobProgress(j) }));
  const tts = await getTts();
  return {
    episode: ep,
    series: { id: series.id, title: series.title, artwork: series.artwork },
    settings: prod.settings,
    layers: await layersFor(prod.settings),
    sections: sections.map((text, i) => {
      const a = sectionAssets[i] ?? null;
      return { index: i, words: text.split(/\s+/).length, excerpt: text.slice(0, 180), asset: a ? { id: a.id, url: a.url, duration_seconds: a.duration_seconds, simulated: a.simulated } : null };
    }),
    mix: mix ? { id: mix.id, url: mix.url, duration_seconds: mix.duration_seconds, simulated: mix.simulated, qa: mix.qa, mime_type: mix.mime_type, created_at: mix.created_at, peaks: (mix.meta.peaks as number[] | undefined) ?? null } : null,
    jobs,
    voices: await db.list("voice_profiles", { where: { approved: true } }),
    soundscapes: await db.list("soundscapes"),
    tts: { provider: tts.name, simulated: tts.simulated },
    has_script: hasScript,
  };
});
