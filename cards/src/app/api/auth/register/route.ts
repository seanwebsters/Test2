import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { registerInput, registerTx } from "@/lib/services/users";

export const POST = route({ schema: registerInput, limit: 5 }, async ({ user, body }) => {
  const u = await getStore().transact((d) => registerTx(d, user.id, body, now()));
  return { username: u.username };
});
