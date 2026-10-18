import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/home", "/path", "/missions", "/coach", "/opportunities", "/profile", "/settings", "/challenge", "/recap"];
const SESSION = "dir_session";
const SB_ACCESS = "dir_sb_access";
const SB_REFRESH = "dir_sb_refresh";

function jwtExp(token: string): number | null {
  try {
    const part = token.split(".")[1] ?? "";
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return (JSON.parse(json) as { exp?: number }).exp ?? null;
  } catch {
    return null;
  }
}

/**
 * Edge middleware: keeps Supabase sessions fresh (refreshing tokens before
 * server components read them) and redirects signed-out visitors away from
 * private screens. Real verification happens server-side on every request.
 */
export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = !!(url && anon);
  let res = NextResponse.next();

  if (supabase) {
    const access = req.cookies.get(SB_ACCESS)?.value;
    const refresh = req.cookies.get(SB_REFRESH)?.value;
    const exp = access ? jwtExp(access) : null;
    if (refresh && (!access || (exp && exp * 1000 < Date.now() + 60_000))) {
      try {
        const r = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: { apikey: anon!, "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (r.ok) {
          const data = (await r.json()) as { access_token: string; refresh_token: string };
          req.cookies.set(SB_ACCESS, data.access_token);
          req.cookies.set(SB_REFRESH, data.refresh_token);
          res = NextResponse.next({ request: { headers: req.headers } });
          const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 };
          res.cookies.set(SB_ACCESS, data.access_token, opts);
          res.cookies.set(SB_REFRESH, data.refresh_token, opts);
        }
      } catch {
        // Network trouble: let the request through; the server will treat the user as signed out.
      }
    }
  }

  const path = req.nextUrl.pathname;
  const signedIn = supabase ? !!req.cookies.get(SB_ACCESS)?.value : !!req.cookies.get(SESSION)?.value;
  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const to = req.nextUrl.clone();
    to.pathname = "/welcome";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|icon|apple-icon|manifest|sw.js|api/billing/webhook).*)"],
};
