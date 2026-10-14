import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { getViewer } from "@/lib/auth/session";
import { setFollowSeries } from "@/lib/services/library";

const Body = z.object({ series_id: z.string().min(1), value: z.boolean() });

export const POST = route(async (req) => {
  const body = await parseBody(req, Body);
  return setFollowSeries(await getViewer(), body.series_id, body.value);
});
