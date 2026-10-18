import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { startEpisodeTx } from "@/lib/services/story";

export const POST = route({ schema: z.object({ episodeId: z.string().max(120) }), limit: 30 }, async ({ user, body }) => {
  const result = await getStore().transact((d) => startEpisodeTx(d, user.id, body.episodeId, now()));
  return { result, wallet: getStore().read().wallets[user.id] };
});
