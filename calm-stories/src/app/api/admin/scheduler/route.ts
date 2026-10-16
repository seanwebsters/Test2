import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { releaseDueEpisodes } from "@/lib/services/releases";

/** Run the release check now (same as the cron heartbeat). */
export const POST = route(async () => {
  await requireEditor();
  return { released: await releaseDueEpisodes() };
});
