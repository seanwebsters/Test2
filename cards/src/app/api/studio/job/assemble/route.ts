import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { assembleUniverseTx } from "@/lib/studio/engine";

export const POST = route({ admin: true, schema: z.object({ jobId: z.string().max(60) }) }, async ({ user, body }) => {
  const u = await getStore().transact((d) => assembleUniverseTx(d, user.id, body.jobId, now()));
  return { universeId: u.id, slug: u.slug };
});
