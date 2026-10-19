import { NextResponse } from "next/server";
import { ACCESS_COOKIE, ACCESS_MAX_AGE, accessToken, checkPassword } from "@/lib/auth/studio-access";
import { env } from "@/lib/env";

const attempts = new Map<string, { n: number; until: number }>();

/** Exchange the studio password for an access cookie (owner = full control, team = view-only). */
export async function POST(req: Request) {
  if (!env.studioLocked) return NextResponse.json({ error: "The studio isn't password-protected." }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0]!.trim();
  const a = attempts.get(ip);
  if (a && a.n >= 8 && a.until > Date.now()) return NextResponse.json({ error: "Too many tries – wait 10 minutes." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { password?: string; next?: string };
  const role = checkPassword(String(body.password ?? ""));
  if (!role) {
    attempts.set(ip, { n: (a && a.until > Date.now() ? a.n : 0) + 1, until: Date.now() + 10 * 60_000 });
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ error: "That password isn't right." }, { status: 401 });
  }
  attempts.delete(ip);
  const next = typeof body.next === "string" && body.next.startsWith("/") && !body.next.startsWith("//") ? body.next : "/studio";
  const res = NextResponse.json({ ok: true, role, next });
  const https = req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https:");
  res.cookies.set(ACCESS_COOKIE, accessToken(role), { httpOnly: true, sameSite: "lax", secure: https, path: "/", maxAge: ACCESS_MAX_AGE });
  return res;
}

/** Sign out of the studio. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ACCESS_COOKIE);
  return res;
}
