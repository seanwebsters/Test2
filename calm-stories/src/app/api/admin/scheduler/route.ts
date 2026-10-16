import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { releaseDueEpisodes } from "@/lib/services/releases";
import { processQueue, runScheduledProduction } from "@/lib/agents";

/** Run the heartbeat now: schedule production, start queued jobs, release due episodes. */
export const POST = route(async () => {
  await requireEditor();
  const scheduled = await runScheduledProduction();
  const started = await processQueue();
  return { scheduled: scheduled.length, started, released: await releaseDueEpisodes() };
});
