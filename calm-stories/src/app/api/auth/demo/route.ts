import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { startDemoSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { forbidden, notFound } from "@/lib/errors";

const Body = z.object({ user_id: z.string().min(1) });

/** Demo persona sign-in. Disabled when a real identity provider is configured. */
export const POST = route(async (req) => {
  if (env.authProvider !== "demo") throw forbidden("Demo sign-in is disabled in this environment.");
  const { user_id } = await parseBody(req, Body);
  const user = await getDb().get("users", user_id);
  if (!user) throw notFound("Unknown demo account.");
  await startDemoSession(user.id);
  return { ok: true };
});
