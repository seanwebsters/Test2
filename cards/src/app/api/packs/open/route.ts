import { catalog } from "@/lib/catalog";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { cryptoRng } from "@/lib/economy/rng";
import { openPackInput, openPackTx } from "@/lib/services/packs";
import { faceFor, type CardFace } from "@/lib/view/face";

/** Pack results are drawn and persisted server-side in one transaction. */
export const POST = route({ schema: openPackInput, limit: 20 }, async ({ user, body }) => {
  const { opening, replayed } = await getStore().transact((d) => openPackTx(d, user.id, body, cryptoRng, now()));
  const state = getStore().read();
  const idx = catalog(state);
  const faces: Record<string, CardFace> = {};
  for (const i of opening.items) {
    const c = idx.cards.get(i.cardId)!;
    faces[c.id] = faceFor(c, idx.byId.get(c.universeId)!);
  }
  return { opening, replayed, faces, wallet: state.wallets[user.id] };
});
