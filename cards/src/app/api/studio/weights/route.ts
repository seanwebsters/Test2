import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { updateWeightsTx, weightsInput } from "@/lib/studio/content";

export const POST = route({ admin: true, schema: weightsInput }, async ({ user, body }) => ({
  result: await getStore().transact((d) => updateWeightsTx(d, user.id, body, now())) ?? null,
}));
