import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { chat } from "@/lib/storymaker/agent";

export const maxDuration = 300;

export const POST = route(async (req) => {
  const input = await body(req, z.object({ message: z.string().min(1).max(8000), seriesId: z.string().nullish(), conversationId: z.string().nullish() }));
  const out = await chat(await getViewer(), input);
  return json(out);
}, { limit: 20, bucket: "storymaker-chat" });
