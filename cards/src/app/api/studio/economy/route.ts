import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { updateEconomyTx, economyInput } from "@/lib/studio/content";

export const POST = route({ admin: true, schema: economyInput }, async ({ user, body }) => ({
  result: await getStore().transact((d) => updateEconomyTx(d, user.id, body, now())) ?? null,
}));
