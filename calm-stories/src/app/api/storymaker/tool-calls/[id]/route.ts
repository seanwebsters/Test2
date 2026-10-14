import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { resolvePendingCall } from "@/lib/storymaker/agent";

export const maxDuration = 300;

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const { decision } = await body(req, z.object({ decision: z.enum(["confirm", "cancel"]) }));
  const out = await resolvePendingCall(await getViewer(), id, decision);
  if (out.status === "cancelled") return json({ status: "cancelled", seriesId: out.seriesId });
  const r = out.result;
  if (r.status === "failed") return json({ error: r.error }, { status: 400 });
  return json({ status: r.status, summary: r.status === "executed" ? r.outcome.summary : null, seriesId: out.seriesId });
}, { limit: 30 });
