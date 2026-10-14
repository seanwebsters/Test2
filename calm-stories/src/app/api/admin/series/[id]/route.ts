import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { setSeriesStatus } from "@/lib/admin";

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const input = await body(req, z.object({ status: z.enum(["published", "archived", "removed", "draft"]), reason: z.string().max(2000).optional() }));
  return json(await setSeriesStatus(await getViewer(), id, input.status, input.reason));
});
