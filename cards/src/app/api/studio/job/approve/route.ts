import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { setApprovalTx, STEPS, type StepKey } from "@/lib/studio/engine";

const input = z.object({ jobId: z.string().max(60), step: z.enum(STEPS.map((s) => s.key) as [StepKey, ...StepKey[]]), version: z.number().int().min(1), approval: z.enum(["approved", "rejected"]), notes: z.string().max(500).optional() });

export const POST = route({ admin: true, schema: input }, async ({ user, body }) => {
  await getStore().transact((d) => setApprovalTx(d, user.id, body.jobId, body.step, body.version, body.approval, now(), body.notes));
  return { ok: true };
});
