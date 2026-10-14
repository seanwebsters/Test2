import { getViewer } from "@/lib/auth";
import { HttpError, json, route } from "@/lib/api";
import { env } from "@/lib/env";
import { runWorkflows, tick } from "@/lib/jobs/engine";
import { releaseDue } from "@/lib/publishing";

export const maxDuration = 300;

/**
 * Scheduler heartbeat (Vercel Cron every 15 minutes, see vercel.json):
 * fills workflow release slots, releases approved episodes that are due,
 * and starts queued jobs. Requires CRON_SECRET or an administrator.
 */
export const GET = route(async (req) => {
  const auth = req.headers.get("authorization");
  const viaSecret = !!env.cronSecret && auth === `Bearer ${env.cronSecret}`;
  if (!viaSecret && !(await getViewer()).isAdmin) throw new HttpError(401, "Unauthorized");
  const enqueued = await runWorkflows();
  const released = await releaseDue();
  const started = await tick();
  return json({ enqueued, released, started, at: new Date().toISOString() });
}, { limit: 30, bucket: "cron" });
