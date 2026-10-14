import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { decideReview } from "@/lib/publishing";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const input = await body(req, z.object({ decision: z.enum(["approved", "changes_requested", "rejected"]), notes: z.string().max(4000).optional(), releaseAt: z.string().nullish() }));
  return json(await decideReview(await getViewer(), id, input.decision, { notes: input.notes, releaseAt: input.releaseAt ?? null }));
}, { limit: 60 });
