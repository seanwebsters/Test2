import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors";
import { askStudio } from "@/lib/studio/ask";

const Body = z.object({ question: z.string().min(2).max(2000) });

/** "Ask the studio": plain-English answers grounded in the live studio state. */
export const POST = route(async (req) => {
  await requireEditor();
  const { question } = await parseBody(req, Body);
  try {
    return await askStudio(question);
  } catch (err) {
    throw badRequest(`Couldn't answer: ${err instanceof Error ? err.message : String(err)}`);
  }
});
