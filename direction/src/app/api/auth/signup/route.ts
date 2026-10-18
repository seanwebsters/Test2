import { z } from "zod";
import { signUp } from "@/lib/server/auth";
import { storeFor } from "@/lib/server/context";
import { assertSameOrigin, handle, json, parseBody } from "@/lib/server/http";
import { CredentialsSchema, OnboardingSchema } from "@/lib/server/schemas";
import { ensureProfile, saveOnboarding, startPath } from "@/lib/server/services";

const Body = CredentialsSchema.extend({
  onboarding: OnboardingSchema.optional(),
  timezone: z.string().max(60).optional(),
  startPath: z.string().max(80).nullish(),
});

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const body = await parseBody(req, Body);
  const { viewer } = await signUp(body.email, body.password);
  await ensureProfile(storeFor(viewer), viewer);
  if (body.onboarding) await saveOnboarding(viewer, body.onboarding, body.timezone);
  if (body.startPath) await startPath(viewer, body.startPath);
  return json({ ok: true });
});
