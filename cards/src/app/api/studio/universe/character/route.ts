import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { addCharacterTx, characterInput } from "@/lib/studio/content";

export const POST = route({ admin: true, schema: characterInput }, async ({ user, body }) => ({
  result: await getStore().transact((d) => addCharacterTx(d, user.id, body, now())) ?? null,
}));
