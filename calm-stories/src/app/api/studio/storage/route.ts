import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { diskUsage, freeUpSpace } from "@/lib/services/disk";

/** Disk usage of the studio's volume. */
export const GET = route(async () => {
  await requireEditor();
  return { usage: diskUsage({ breakdown: true }) };
});

/** Delete unused files and compress older audio/artwork. */
export const POST = route(async () => {
  await requireEditor();
  return { ...(await freeUpSpace()), usage: diskUsage({ breakdown: true }) };
});
