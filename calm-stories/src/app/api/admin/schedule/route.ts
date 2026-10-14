import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { reschedule } from "@/lib/services/editorial";

const Body = z.object({ episode_id: z.string(), release_at: z.string().datetime() });

export const POST = route(async (req) => {
  const editor = await requireEditor();
  const b = await parseBody(req, Body);
  return reschedule(b.episode_id, b.release_at, editor.user.id);
});
