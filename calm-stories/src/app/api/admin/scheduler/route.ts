import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { releaseDueEpisodes } from "@/lib/services/releases";
import { runScheduledProduction, tick } from "@/lib/studio";

/** Run the heartbeat now. */
export const POST = route(async () => {
  await requireEditor();
  const scheduled = await runScheduledProduction();
  const started = await tick();
  return { scheduled: scheduled.length, started, released: await releaseDueEpisodes() };
});
