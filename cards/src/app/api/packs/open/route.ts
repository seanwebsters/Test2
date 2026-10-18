import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { cryptoRng } from "@/lib/economy/rng";
import { openPackInput, openPackTx } from "@/lib/services/packs";

/** Pack results are drawn and persisted server-side in one transaction. */
export const POST = route({ schema: openPackInput, limit: 20 }, async ({ user, body }) => {
  const { opening, replayed } = await getStore().transact((d) => openPackTx(d, user.id, body, cryptoRng, now()));
  const w = getStore().read().wallets[user.id];
  return { opening, replayed, wallet: w };
});
