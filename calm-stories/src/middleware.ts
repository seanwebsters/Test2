import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { ACCESS_COOKIE, readAccess, TEAM_ALLOWED_WRITES } from "@/lib/auth/studio-access";

/**
 * Studio lock (active once STUDIO_OWNER_PASSWORD is set):
 *  - studio and admin pages need the studio password (owner or team);
 *  - studio/admin APIs refuse changes from a team (view-only) login;
 *  - the open /dev link and the cron trigger are closed (cron needs CRON_SECRET).
 * Redirects use the public host so they work behind Railway's proxy.
 */
export function middleware(req: NextRequest) {
  if (!env.studioLocked) return NextResponse.next();
  const path = req.nextUrl.pathname;
  // Absolute redirect built from the address the browser used (behind Railway's proxy the server itself is localhost).
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host).split(",")[0]!.trim();
  const proto = (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")).split(",")[0]!.trim();
  const redirect = (to: string) => NextResponse.redirect(`${proto}://${host}${to}`, 307);
  const json = (status: number, error: string) => NextResponse.json({ error }, { status });

  if (path === "/dev") return redirect("/studio-login");
  if (path.startsWith("/api/cron")) {
    const ok = env.cronSecret && req.headers.get("authorization") === `Bearer ${env.cronSecret}`;
    return ok ? NextResponse.next() : json(401, "Unauthorized");
  }

  const role = readAccess(req.cookies.get(ACCESS_COOKIE)?.value);
  const isApi = path.startsWith("/api/");
  if (!role) return isApi ? json(401, "Enter the studio password first.") : redirect(`/studio-login?next=${encodeURIComponent(path + req.nextUrl.search)}`);
  const write = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (role === "team" && write && !TEAM_ALLOWED_WRITES.includes(path)) return json(403, "View-only access – ask the studio owner to make changes.");
  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/studio/:path*", "/studio", "/admin/:path*", "/admin", "/api/studio/:path*", "/api/admin/:path*", "/api/cron/:path*", "/dev"],
};
