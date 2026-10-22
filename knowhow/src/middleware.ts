import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, newGuestId, signSession, verifySession } from "@/lib/session";

/** Every visitor gets a signed guest session so progress persists before sign-in. */
export async function middleware(req: NextRequest) {
  const existing = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (existing) return NextResponse.next();
  const value = await signSession(newGuestId());
  // Make the new cookie visible to this same request's server components and route handlers.
  const headers = new Headers(req.headers);
  const others = (req.headers.get("cookie") ?? "").split(/;\s*/).filter((c) => c && !c.startsWith(`${SESSION_COOKIE}=`));
  headers.set("cookie", [...others, `${SESSION_COOKIE}=${value}`].join("; "));
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set(SESSION_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 400 });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|icon|.*\\.(?:svg|png|jpg|webp|mp3|woff2?)$).*)"],
};
