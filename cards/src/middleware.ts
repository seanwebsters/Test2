import { NextResponse, type NextRequest } from "next/server";
import { newGuestId, SESSION_COOKIE, signToken, verifyToken } from "@/lib/auth/token";

/**
 * Every visitor gets a signed guest session immediately so they can open a
 * pack before creating an account. The account is created lazily in the
 * store on first use.
 */
export async function middleware(req: NextRequest) {
  const existing = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (existing) return NextResponse.next();
  const token = await signToken(newGuestId());
  // Make the cookie visible to this same request's server components.
  const headers = new Headers(req.headers);
  const others = req.cookies.getAll().filter((c) => c.name !== SESSION_COOKIE).map((c) => `${c.name}=${c.value}`);
  headers.set("cookie", [...others, `${SESSION_COOKIE}=${token}`].join("; "));
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 400 });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|icon|manifest|sw.js|.*\\.(?:svg|png|jpg|webp|ico)$).*)"],
};
