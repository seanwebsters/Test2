import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { startEpisodeProduction } from "@/lib/studio";
import { studioAction } from "@/lib/studio/http";

const Body = z.object({ series_id: z.string(), release_at: z.string().datetime().nullable().optional() });

/** Commission the next episode of a greenlit series now. */
export const POST = route(async (req) => {
  const viewer = await requireEditor();
  const b = await parseBody(req, Body);
  const { run } = await studioAction(() => startEpisodeProduction({ seriesId: b.series_id, userId: viewer.user.id, releaseAt: b.release_at ?? null }));
  return { run_id: run.id };
});
