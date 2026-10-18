import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { profileInput, updateProfileTx } from "@/lib/services/users";

export const POST = route({ schema: profileInput, limit: 20 }, async ({ user, body }) => {
  const u = await getStore().transact((d) => updateProfileTx(d, user.id, body));
  return { username: u.username };
});
