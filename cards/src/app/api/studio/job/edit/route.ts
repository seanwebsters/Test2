import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { editOutputTx, STEPS, type StepKey } from "@/lib/studio/engine";

const input = z.object({ jobId: z.string().max(60), step: z.enum(STEPS.map((s) => s.key) as [StepKey, ...StepKey[]]), output: z.unknown() });

export const POST = route({ admin: true, schema: input }, async ({ user, body }) => {
  await getStore().transact((d) => editOutputTx(d, user.id, body.jobId, body.step, body.output, now()));
  return { ok: true };
});
