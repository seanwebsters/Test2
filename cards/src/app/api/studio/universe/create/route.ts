import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { createUniverseTx, newUniverseInput } from "@/lib/studio/content";

export const POST = route({ admin: true, schema: newUniverseInput }, async ({ user, body }) => ({
  result: await getStore().transact((d) => createUniverseTx(d, user.id, body, now())) ?? null,
}));
