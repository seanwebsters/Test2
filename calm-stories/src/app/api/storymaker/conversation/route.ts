import { getViewer } from "@/lib/auth";
import { json, route } from "@/lib/api";
import { getConversation } from "@/lib/storymaker/agent";

export const GET = route(async (req) => {
  const seriesId = new URL(req.url).searchParams.get("seriesId");
  return json({ conversation: await getConversation(await getViewer(), seriesId || null) });
});
