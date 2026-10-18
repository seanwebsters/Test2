import { z } from "zod";
import { requireViewer } from "@/lib/server/auth";
import { assertSameOrigin, handle, json, parseBody } from "@/lib/server/http";
import { OnboardingSchema } from "@/lib/server/schemas";
import { saveOnboarding } from "@/lib/server/services";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  const body = await parseBody(req, z.object({ answers: OnboardingSchema, timezone: z.string().max(60).optional() }));
  const profile = await saveOnboarding(viewer, body.answers, body.timezone);
  return json({ matches: profile.matches });
});
