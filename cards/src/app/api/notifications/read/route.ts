import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { iso } from "@/lib/services/core";

export const POST = route({ schema: z.object({ ids: z.array(z.string().max(60)).max(200).optional() }) }, async ({ user, body }) => {
  await getStore().transact((d) => {
    for (const n of d.notifications) if (n.userId === user.id && !n.readAt && (!body.ids || body.ids.includes(n.id))) n.readAt = iso(now());
  });
  return { ok: true };
});
