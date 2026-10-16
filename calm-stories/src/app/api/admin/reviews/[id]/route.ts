import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { decideReview } from "@/lib/services/editorial";
import { forbidden } from "@/lib/errors";
import { getStudioSettings } from "@/lib/studio/settings";

const Body = z.object({
  decision: z.enum(["approve", "reject", "changes_requested"]),
  notes: z.string().max(4000).optional(),
  release_at: z.string().datetime().nullable().optional(),
});

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const editor = await requireEditor();
  const { id } = await params;
  const body = await parseBody(req, Body);
  if (body.decision === "approve") {
    // Publishing permission is a studio setting; agents can never approve.
    const { publish_roles } = await getStudioSettings();
    if (!editor.roles.some((r) => (publish_roles as string[]).includes(r))) throw forbidden("Your role isn't allowed to publish episodes.");
  }
  return decideReview(id, editor.user.id, body);
});
