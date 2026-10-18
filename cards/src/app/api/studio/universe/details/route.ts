import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { updateDetailsTx, detailsInput } from "@/lib/studio/content";

export const POST = route({ admin: true, schema: detailsInput }, async ({ user, body }) => ({
  result: await getStore().transact((d) => updateDetailsTx(d, user.id, body, now())) ?? null,
}));
