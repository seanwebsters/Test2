import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { setDemoCollectorPassTx } from "@/lib/services/users";

/** Demo billing only: toggles a Collector Pass without taking payment. */
export const POST = route({ schema: z.object({ active: z.boolean() }), limit: 10 }, async ({ user, body }) => {
  await getStore().transact((d) => setDemoCollectorPassTx(d, user.id, body.active, now()));
  return { ok: true, demo: true };
});
