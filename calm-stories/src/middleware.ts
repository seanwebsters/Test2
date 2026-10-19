import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { ACCESS_COOKIE, ACCESS_MAX_AGE, accessToken, readAccess, TEAM_ALLOWED_WRITES, teamMayView } from "@/lib/auth/studio-access";

/**
 * Studio lock:
 *  - the AI Team page is the team's view-only window (open with the link, or
 *    behind STUDIO_TEAM_PASSWORD when that's set);
 *  - every other studio/admin page and API needs Sean's owner passcode;
 *  - team (view-only) visitors can't change anything;
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

  let role = readAccess(req.cookies.get(ACCESS_COOKIE)?.value);
  const isApi = path.startsWith("/api/");
  const write = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  const login = () => (isApi ? json(401, "Sean access only – enter the passcode first.") : redirect(`/studio-login?next=${encodeURIComponent(path + req.nextUrl.search)}`));
  // Without a team password, the AI Team page is open: visitors get a view-only pass automatically.
  if (!role && !env.studioTeamPassword && teamMayView(path) && !write) {
    const token = accessToken("team");
    const headers = new Headers(req.headers);
    headers.set("cookie", `${req.headers.get("cookie") ? `${req.headers.get("cookie")}; ` : ""}${ACCESS_COOKIE}=${token}`);
    const res = NextResponse.next({ request: { headers } });
    res.cookies.set(ACCESS_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: proto === "https", path: "/", maxAge: ACCESS_MAX_AGE });
    return res;
  }
  if (!role) return login();
  if (role === "team") {
    if (!teamMayView(path)) return login(); // Sean access only
    if (write && !TEAM_ALLOWED_WRITES.includes(path)) return json(403, "View-only access – ask Sean to make changes.");
  }
  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/studio/:path*", "/studio", "/admin/:path*", "/admin", "/api/studio/:path*", "/api/admin/:path*", "/api/cron/:path*", "/dev"],
};
