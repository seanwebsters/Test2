import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getGuidelines } from "@/lib/studio/settings";
import { nowIso } from "@/lib/util";

const Body = z.object({
  id: z.string().min(1),
  content: z.string().max(40000),
  benchmarks: z.array(z.object({ title: z.string().max(200), excerpt: z.string().max(4000), why: z.string().max(1000) })).max(20),
});

/** Edit the house writing guidelines (id "global") or a series addendum (id = series id). */
export const PUT = route(async (req) => {
  await requireEditor();
  const b = await parseBody(req, Body);
  await getGuidelines();
  const db = getDb();
  const row = { ...b, updated_at: nowIso() };
  return { guidelines: (await db.get("writing_guidelines", b.id)) ? await db.update("writing_guidelines", b.id, row) : await db.insert("writing_guidelines", row) };
});
