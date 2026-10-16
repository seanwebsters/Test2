import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { startSeriesDevelopment } from "@/lib/studio";
import { studioAction } from "@/lib/studio/http";

const Body = z.object({ brief: z.string().trim().min(20).max(4000) });

/** Hand the team a brief; they develop it up to your greenlight. */
export const POST = route(async (req) => {
  const viewer = await requireEditor();
  const { brief } = await parseBody(req, Body);
  const { project, run } = await studioAction(() => startSeriesDevelopment({ brief, userId: viewer.user.id }));
  return { project_id: project.id, run_id: run.id };
});
