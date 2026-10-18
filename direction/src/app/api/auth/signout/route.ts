import { clearSession } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";

export const POST = handle(async () => {
  await clearSession();
  return json({ ok: true });
});
