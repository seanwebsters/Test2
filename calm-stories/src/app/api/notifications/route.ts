import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { listNotifications, markRead } from "@/lib/notifications";

export const GET = route(async () => json({ notifications: await listNotifications(await getViewer()) }));

/** Mark notifications as read: `{ ids: [...] }` or `{ all: true }`. */
export const POST = route(async (req) => {
  const input = await body(req, z.object({ ids: z.array(z.string()).max(200).optional(), all: z.boolean().optional() }));
  return json({ updated: await markRead(await getViewer(), input.all ? "all" : (input.ids ?? [])) });
}, { limit: 120 });
