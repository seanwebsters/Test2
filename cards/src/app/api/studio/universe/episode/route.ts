import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { addEpisodeTx, episodeInput } from "@/lib/studio/content";

export const POST = route({ admin: true, schema: episodeInput }, async ({ user, body }) => ({
  result: await getStore().transact((d) => addEpisodeTx(d, user.id, body, now())) ?? null,
}));
