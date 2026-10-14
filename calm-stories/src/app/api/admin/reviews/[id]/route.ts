import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { decideReview } from "@/lib/services/editorial";

const Body = z.object({
  decision: z.enum(["approve", "reject", "changes_requested"]),
  notes: z.string().max(4000).optional(),
  release_at: z.string().datetime().nullable().optional(),
});

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const editor = await requireEditor();
  const { id } = await params;
  return decideReview(id, editor.user.id, await parseBody(req, Body));
});
