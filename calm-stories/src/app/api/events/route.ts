import { z } from "zod";
import { clientKey, enforceRateLimit, parseBody, route } from "@/lib/api";
import { getViewer } from "@/lib/auth/session";
import { recordListeningEvent } from "@/lib/services/library";
import { track } from "@/lib/analytics";

const Body = z.object({
  episode_id: z.string().min(1).max(200),
  kind: z.enum(["play", "pause", "complete", "progress", "seek", "sleep_timer", "upsell"]),
  position_seconds: z.number().min(0).max(36000),
  listened_seconds: z.number().min(0).max(36000),
  anonymous_id: z.string().max(64).nullable().optional(),
});

export const POST = route(async (req) => {
  const viewer = await getViewer();
  enforceRateLimit(`events:${clientKey(req, viewer.user?.id)}`, 120, 120);
  const body = await parseBody(req, Body);
  if (body.kind === "upsell") {
    await track("subscription_upsell_viewed", viewer.user?.id ?? body.anonymous_id ?? "anonymous", { episode_id: body.episode_id });
    return { ok: true };
  }
  await recordListeningEvent(viewer, body.anonymous_id ?? null, { ...body, kind: body.kind });
  return { ok: true };
});
