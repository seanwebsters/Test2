import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { setFollowCreator, setFollowSeries } from "@/lib/services/listener";

export const POST = route(async (req) => {
  const input = await body(req, z.object({ type: z.enum(["series", "creator"]), id: z.string(), follow: z.boolean() }));
  const viewer = await getViewer();
  return json(input.type === "series" ? await setFollowSeries(viewer, input.id, input.follow) : await setFollowCreator(viewer, input.id, input.follow));
}, { limit: 60 });
