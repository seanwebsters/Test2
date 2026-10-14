import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { resolveReport } from "@/lib/services/editorial";

const Body = z.object({ action: z.enum(["dismiss", "takedown"]), note: z.string().max(2000).default("") });

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireEditor();
  const { id } = await params;
  const b = await parseBody(req, Body);
  return resolveReport(id, b.action, b.note);
});
