import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { toggleFavouriteTx } from "@/lib/services/users";

export const POST = route({ schema: z.object({ cardId: z.string().max(120) }), limit: 60 }, async ({ user, body }) => ({
  favourite: await getStore().transact((d) => toggleFavouriteTx(d, user.id, body.cardId, now())),
}));
