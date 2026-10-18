import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { toggleFollowUserTx } from "@/lib/services/users";

export const POST = route({ schema: z.object({ userId: z.string().max(80) }), limit: 60 }, async ({ user, body }) => ({
  following: await getStore().transact((d) => toggleFollowUserTx(d, user.id, body.userId, now())),
}));
