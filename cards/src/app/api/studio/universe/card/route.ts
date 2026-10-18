import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { addCardTx, cardInput } from "@/lib/studio/content";

export const POST = route({ admin: true, schema: cardInput }, async ({ user, body }) => ({
  result: await getStore().transact((d) => addCardTx(d, user.id, body, now())) ?? null,
}));
