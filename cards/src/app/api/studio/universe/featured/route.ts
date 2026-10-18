import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { setFeaturedTx } from "@/lib/studio/content";

export const POST = route({ admin: true, schema: z.object({ universeId: z.string().max(80), featured: z.boolean() }) }, async ({ user, body }) => {
  await getStore().transact((d) => setFeaturedTx(d, user.id, body.universeId, body.featured, now()));
  return { ok: true };
});
