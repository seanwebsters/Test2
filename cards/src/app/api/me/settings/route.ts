import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { settingsInput, updateSettingsTx } from "@/lib/services/users";

export const POST = route({ schema: settingsInput, limit: 30 }, async ({ user, body }) => {
  await getStore().transact((d) => updateSettingsTx(d, user.id, body));
  return { ok: true };
});
