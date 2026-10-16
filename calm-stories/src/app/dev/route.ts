import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { DEV_COOKIE } from "@/lib/auth/providers";

/** Temporary dev access: straight into the studio as Calm Editorial, no login. Disable with DEV_ACCESS=off. */
export function GET(req: NextRequest) {
  if (!env.devAccess) return NextResponse.redirect(new URL("/sign-in", req.url));
  const res = NextResponse.redirect(new URL("/studio", req.url));
  res.cookies.set(DEV_COOKIE, "1", { path: "/", httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", maxAge: 30 * 86400 });
  return res;
}
