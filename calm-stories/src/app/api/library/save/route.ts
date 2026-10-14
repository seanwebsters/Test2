import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { getViewer } from "@/lib/auth/session";
import { setSaved } from "@/lib/services/library";

const Body = z.object({ series_id: z.string().min(1), value: z.boolean(), collection: z.string().trim().min(1).max(60).optional() });

export const POST = route(async (req) => {
  const body = await parseBody(req, Body);
  return setSaved(await getViewer(), body.series_id, body.value, body.collection);
});
