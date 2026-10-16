import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { getStudioSettings } from "@/lib/studio/settings";
import { createRun } from "@/lib/studio/engine";
import "@/lib/studio";

const Body = z.object({ episode_id: z.string(), scene_index: z.number().int().min(1), mode: z.enum(["revoice", "remix"]) });

/** Re-voice or remix a single scene and re-master – without regenerating the rest of the episode. */
export const POST = route(async (req) => {
  const viewer = await requireEditor();
  const b = await parseBody(req, Body);
  const db = getDb();
  const ep = await db.get("episodes", b.episode_id);
  if (!ep) throw notFound();
  const settings = await getStudioSettings();
  const { run } = await createRun({
    kind: "episode_production",
    title: `${b.mode === "revoice" ? "Re-voice" : "Remix"} scene ${b.scene_index} · ${ep.title}`,
    series_id: ep.series_id,
    episode_id: ep.id,
    params: {},
    budget_cents: Math.round(settings.default_episode_budget_cents / 3),
    created_by: viewer.user.id,
    steps: [
      { key: "scene", type: "audio.scene", agent: "audio_producer", label: `${b.mode === "revoice" ? "Re-voice" : "Remix"} scene ${b.scene_index}`, activity: "typing", deps: [], params: { scene_index: b.scene_index, revoice: b.mode === "revoice", remix: b.mode === "remix" } },
      { key: "master", type: "audio.master", agent: "audio_producer", label: "Re-master the episode", activity: "typing", deps: ["scene"] },
    ],
  });
  return { run_id: run.id };
});
