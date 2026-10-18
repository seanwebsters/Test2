import { z } from "zod";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { setShowcaseTx } from "@/lib/services/users";

export const POST = route({ schema: z.object({ cardIds: z.array(z.string().max(120)).max(9) }), limit: 30 }, async ({ user, body }) => {
  await getStore().transact((d) => setShowcaseTx(d, user.id, body.cardIds));
  return { ok: true };
});
