import { z } from "zod";
import { clientKey, enforceRateLimit, parseBody, route } from "@/lib/api";
import { getViewer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { newId, nowIso } from "@/lib/util";

const Body = z.object({
  target_type: z.enum(["series", "episode", "creator"]),
  target_id: z.string().min(1).max(200),
  reason: z.enum(["copyright", "inappropriate", "not_sleep_friendly", "impersonation", "other"]),
  details: z.string().max(2000).default(""),
});

export const POST = route(async (req) => {
  const viewer = await getViewer();
  enforceRateLimit(`report:${clientKey(req, viewer.user?.id)}`, 5, 5);
  const body = await parseBody(req, Body);
  const db = getDb();
  const exists =
    body.target_type === "series"
      ? await db.get("series", body.target_id)
      : body.target_type === "episode"
        ? await db.get("episodes", body.target_id)
        : await db.findOne("creator_profiles", { user_id: body.target_id });
  if (!exists) throw notFound();
  await db.insert("content_reports", {
    id: newId("rpt"),
    reporter_id: viewer.user?.id ?? null,
    target_type: body.target_type,
    target_id: body.target_id,
    reason: body.reason,
    details: body.details,
    status: "open",
    resolution: null,
    created_at: nowIso(),
    resolved_at: null,
  });
  return { ok: true };
});
