import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { claimChallengeTx } from "@/lib/services/daily";

export const POST = route({ schema: z.object({ key: z.string().max(80) }), limit: 20 }, async ({ user, body }) => ({
  reward: await getStore().transact((d) => claimChallengeTx(d, user.id, body.key, now())),
  wallet: getStore().read().wallets[user.id],
}));
