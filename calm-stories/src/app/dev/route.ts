import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { DEV_COOKIE } from "@/lib/auth/providers";

/**
 * Relative redirect: behind a proxy (Railway, Docker) the server sees its own
 * address as localhost, so an absolute URL built from req.url points nowhere.
 */
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

/** Temporary dev access: straight into the studio as Calm Editorial, no login. Disable with DEV_ACCESS=off. */
export function GET(req: NextRequest) {
  if (!env.devAccess) return redirectTo("/sign-in");
  const res = redirectTo("/studio");
  const https = req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https:";
  res.cookies.set(DEV_COOKIE, "1", { path: "/", httpOnly: true, sameSite: "lax", secure: https, maxAge: 30 * 86400 });
  return res;
}
