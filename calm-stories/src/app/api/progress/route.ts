import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { recordProgress } from "@/lib/services/listener";

const schema = z.object({
  episodeId: z.string().min(1),
  position: z.number().min(0).max(60 * 60 * 6),
  duration: z.number().min(0).max(60 * 60 * 6),
  event: z.enum(["play", "pause", "complete", "progress", "seek", "sleep_timer"]).optional(),
  listened: z.number().min(0).max(60 * 60 * 6).optional(),
  anonymousId: z.string().max(64).nullable().optional(),
});

export const POST = route(async (req) => json(await recordProgress(await getViewer(), await body(req, schema))), { limit: 240 });
