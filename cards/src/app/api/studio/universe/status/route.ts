import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { setUniverseStatusTx } from "@/lib/studio/engine";

export const POST = route({ admin: true, schema: z.object({ universeId: z.string().max(80), status: z.enum(["draft", "review", "published", "unpublished"]) }) }, async ({ user, body }) => {
  await getStore().transact((d) => setUniverseStatusTx(d, user.id, body.universeId, body.status, now()));
  return { ok: true };
});
