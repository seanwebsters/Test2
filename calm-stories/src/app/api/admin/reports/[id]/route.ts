import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { resolveReport } from "@/lib/admin";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const input = await body(req, z.object({ action: z.enum(["actioned", "dismissed"]), resolution: z.string().max(2000) }));
  return json(await resolveReport(await getViewer(), id, input.action, input.resolution));
});
