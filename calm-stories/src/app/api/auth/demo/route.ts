import { cookies } from "next/headers";
import { z } from "zod";
import { body, HttpError, json, route } from "@/lib/api";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { SESSION_COOKIE, signSession } from "@/lib/auth/session";
import { DEMO_PERSONAS } from "@/lib/auth/personas";

/**
 * Prototype sign-in: switch between the seeded demo personas. Disabled when
 * AUTH_PROVIDER=supabase (or Calm identity) is configured.
 */
export const POST = route(async (req) => {
  if (env.authProvider !== "demo") throw new HttpError(404, "Demo sign-in is disabled");
  const { userId } = await body(req, z.object({ userId: z.string().nullable() }));
  const jar = await cookies();
  if (!userId) {
    jar.delete(SESSION_COOKIE);
    return json({ ok: true });
  }
  if (!DEMO_PERSONAS.some((p) => p.userId === userId)) throw new HttpError(400, "Unknown demo persona");
  const user = await getDb().get("users", userId);
  if (!user) throw new HttpError(400, "Demo user missing – reset the local database");
  jar.set(SESSION_COOKIE, signSession(userId), { httpOnly: true, sameSite: "lax", secure: env.appEnv === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return json({ ok: true });
}, { limit: 30 });
