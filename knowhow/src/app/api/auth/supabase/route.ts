import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, sessionUserId } from "@/lib/auth";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import { store, supabaseConfigured, withUser } from "@/lib/store";

const Body = z.object({ accessToken: z.string().min(20).max(4000) });

/**
 * Exchanges a Supabase access token (from the email OTP sign-in on /sign-in) for a
 * KNOWHOW session. The token is verified with Supabase server-side. A first sign-in
 * carries over the guest's progress.
 */
export const POST = handler(async (req: Request) => {
  if (!supabaseConfigured()) throw new HttpError(503, "Supabase auth is not configured");
  const { accessToken } = await body(req, Body);
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(accessToken);
  if (error || !data.user) throw new HttpError(401, "Invalid sign-in");
  const accountId = `sb_${data.user.id.replace(/-/g, "")}`;
  const guestId = await sessionUserId().catch(() => null);

  const existing = await store.getUser(accountId);
  if (!existing && guestId && guestId.startsWith("g_")) {
    const guest = await store.getUser(guestId);
    if (guest) {
      const migrated = { ...structuredClone(guest), id: accountId, email: data.user.email ?? undefined };
      await store.saveUser(migrated, null);
    }
  }
  await withUser(accountId, (u) => { u.email = data.user!.email ?? u.email; });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(accountId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 400 });
  return NextResponse.json({ ok: true });
});
