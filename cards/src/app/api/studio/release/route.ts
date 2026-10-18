import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { ServiceError } from "@/lib/services/core";
import { scheduleEpisodeTx } from "@/lib/studio/content";

export const POST = route({ admin: true, schema: z.object({ episodeId: z.string().max(120), releaseAt: z.string().max(40) }) }, async ({ user, body }) => {
  const at = now();
  const when = body.releaseAt === "now" ? at : Date.parse(body.releaseAt);
  if (Number.isNaN(when)) throw new ServiceError("bad_date", "Invalid date");
  await getStore().transact((d) => scheduleEpisodeTx(d, user.id, body.episodeId, when, at));
  return { ok: true };
});
