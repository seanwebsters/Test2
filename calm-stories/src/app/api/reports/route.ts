import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { getDb } from "@/lib/db";
import { newId, nowIso } from "@/lib/util";

export const POST = route(async (req) => {
  const input = await body(
    req,
    z.object({
      targetType: z.enum(["series", "episode", "creator"]),
      targetId: z.string().min(1).max(200),
      reason: z.enum(["copyright", "inappropriate", "not_sleep_friendly", "impersonation", "other"]),
      details: z.string().max(2000).default(""),
    }),
  );
  const viewer = await getViewer();
  const row = await getDb().insert("content_reports", {
    id: newId("report"),
    reporter_id: viewer.user?.id ?? null,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details ?? "",
    status: "open",
    resolution: null,
    created_at: nowIso(),
    resolved_at: null,
  });
  return json({ id: row.id });
}, { limit: 10 });
