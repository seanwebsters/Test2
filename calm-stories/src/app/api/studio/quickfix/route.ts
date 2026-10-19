import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { studioBoard } from "@/lib/studio/now";
import { quickFix } from "@/lib/studio/quickfix";

const Body = z.object({ run_id: z.string().optional(), all: z.boolean().optional() });

/** Quick fix one stuck workflow, or every stuck workflow. */
export const POST = route(async (req) => {
  await requireEditor();
  const b = await parseBody(req, Body);
  const ids = b.all ? (await studioBoard()).stuck.map((i) => i.runId) : b.run_id ? [b.run_id] : [];
  const results = [];
  for (const id of ids) results.push({ run_id: id, ...(await quickFix(id)) });
  return { results };
});
