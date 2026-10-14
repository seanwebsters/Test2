import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { setSaved } from "@/lib/services/listener";

export const POST = route(async (req) => {
  const { seriesId, saved } = await body(req, z.object({ seriesId: z.string(), saved: z.boolean() }));
  return json(await setSaved(await getViewer(), seriesId, saved));
}, { limit: 60 });
