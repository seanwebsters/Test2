import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { executeStep, queueStepTx, STEPS, type StepKey } from "@/lib/studio/engine";
import { aiProvider } from "@/lib/studio/providers";

const input = z.object({ jobId: z.string().max(60), step: z.enum(STEPS.map((s) => s.key) as [StepKey, ...StepKey[]]), mode: z.enum(["ai", "template"]).default("ai") });

/** Queues a step and runs it in the background; the client polls the job. */
export const POST = route({ admin: true, limit: 30, schema: input }, async ({ user, body }) => {
  const provider = body.mode === "ai" ? aiProvider() : undefined;
  const store = getStore();
  const version = await store.transact((d) => queueStepTx(d, user.id, body.jobId, body.step, provider ? `${provider.id}` : "template", now()));
  void executeStep(store, body.jobId, body.step, provider).catch((e) => console.error("[studio] step crashed", e));
  return { version, provider: provider ? provider.label : "Offline template (no AI provider configured)" };
});
