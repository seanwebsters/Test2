import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { craftCardTx } from "@/lib/services/packs";

export const POST = route({ schema: z.object({ cardId: z.string().max(120) }), limit: 20 }, async ({ user, body }) => {
  const r = await getStore().transact((d) => craftCardTx(d, user.id, body.cardId, now()));
  return { ...r, wallet: getStore().read().wallets[user.id] };
});
