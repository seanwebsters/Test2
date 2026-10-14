import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { publishNow, scheduleRelease, unschedule } from "@/lib/publishing";

/** Publishing calendar: move, clear or immediately release an episode. */
export const POST = route(async (req) => {
  const input = await body(req, z.object({ episodeId: z.string(), action: z.enum(["schedule", "unschedule", "publish_now"]), releaseAt: z.string().optional() }));
  const viewer = await getViewer();
  if (input.action === "publish_now") return json({ released: await publishNow(viewer, input.episodeId) });
  if (input.action === "unschedule") {
    await unschedule(viewer, input.episodeId);
    return json({ ok: true });
  }
  return json(await scheduleRelease(viewer, input.episodeId, input.releaseAt ?? ""));
}, { limit: 120 });
