import { route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import "@/lib/jobs/workflows";
import { processQueue } from "@/lib/jobs/runner";
import { releaseDueEpisodes, runScheduledProduction } from "@/lib/production/scheduler";

/** Run the production scheduler and release check now (same as the cron heartbeat). */
export const POST = route(async () => {
  await requireAdmin();
  const released = await releaseDueEpisodes();
  const scheduled = await runScheduledProduction();
  const started = await processQueue();
  return { released, scheduled: scheduled.length, started };
});
