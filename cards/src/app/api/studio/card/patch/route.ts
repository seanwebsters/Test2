import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { patchCardTx, cardPatchInput } from "@/lib/studio/content";

export const POST = route({ admin: true, schema: cardPatchInput }, async ({ user, body }) => ({
  result: await getStore().transact((d) => patchCardTx(d, user.id, body, now())) ?? null,
}));
