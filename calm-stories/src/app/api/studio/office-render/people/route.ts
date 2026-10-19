import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors";
import { startOfficePeople } from "@/lib/studio/office-render";

const Body = z.object({ redo: z.boolean().optional() });

/** Start making 3D character sprites for the team (runs in the background on the server). */
export const POST = route(async (req) => {
  await requireEditor();
  const { redo } = await parseBody(req, Body);
  try {
    return await startOfficePeople(Boolean(redo));
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : String(err));
  }
});
