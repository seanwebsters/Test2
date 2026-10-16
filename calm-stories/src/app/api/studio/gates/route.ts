import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { badRequest } from "@/lib/errors";
import { resolveGate } from "@/lib/studio";
import { studioAction } from "@/lib/studio/http";

const Body = z.object({ run_id: z.string(), step_key: z.string(), approved: z.boolean(), notes: z.string().max(4000).default("") });

/** Network Executive decisions on approval gates (series greenlight). Episode approvals go through the review queue. */
export const POST = route(async (req) => {
  const viewer = await requireEditor();
  const body = await parseBody(req, Body);
  const step = await getDb().findOne("workflow_steps", { run_id: body.run_id, key: body.step_key });
  if (step?.type === "ep.approval") throw badRequest("Approve episodes from the approvals queue so the release is scheduled.");
  await studioAction(() => resolveGate(body.run_id, body.step_key, { approved: body.approved, userId: viewer.user.id, notes: body.notes }));
  return { ok: true };
});
