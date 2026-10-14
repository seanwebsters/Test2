import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { getViewer } from "@/lib/auth/session";
import { setFollowCreator } from "@/lib/services/library";

const Body = z.object({ creator_id: z.string().min(1), value: z.boolean() });

export const POST = route(async (req) => {
  const body = await parseBody(req, Body);
  return setFollowCreator(await getViewer(), body.creator_id, body.value);
});
