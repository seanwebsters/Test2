import { ok, rateLimit, route, HttpError } from "@/lib/http";
import { repo } from "@/lib/store";
import { review } from "@/lib/agents";
import { playStats, dropOff } from "@/lib/insights";
import { hasCredentials } from "@/lib/ai/client";
import { defaultSettings } from "@/lib/settings";
import { newId } from "@/lib/ids";

type Ctx = { params: Promise<{ id: string }> };

/** Observed numbers only: computed from locally recorded play events. */
export const GET = route(async (_req, { params }: Ctx) => {
  const id = (await params).id;
  const stats = await playStats(id);
  return ok({ stats, dropOff: dropOff(stats) });
});

/** Ask the Insights agent to interpret the numbers. Its output separates observation from hypothesis. */
export const POST = route(async (req, { params }: Ctx) => {
  if (!hasCredentials()) throw new HttpError(503, "ANTHROPIC_API_KEY is not set.");
  rateLimit(req, "insights");
  const store = await repo();
  const id = (await params).id;
  const game = await store.getGame(id);
  if (!game) throw new HttpError(404, "Game not found");
  const version = await store.getVersion(id, game.currentVersion);
  if (!version) throw new HttpError(400, "No playable version");
  const stats = await playStats(id, version.number);
  const settings = (await store.getSettings()) ?? defaultSettings();
  const r = await review({ settings, jobId: newId("insight"), onActivity: () => {} }, {
    ideation: version.specs.ideation,
    design: version.specs.design,
    config: version.build?.mode === "template" ? version.build.config : undefined,
    freeform: version.build?.mode === "freeform",
    qa: version.qa,
    stats,
  });
  await store.putVersion({ ...version, review: r.data });
  return ok({ review: r.data, stats, costUsd: r.costUsd });
});
