import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import { signToken, verifyToken } from "./session-token";

/**
 * Password access to the studio, for sharing it safely:
 *  - owner (Sean's passcode, or STUDIO_OWNER_PASSWORD to override): every page, full control;
 *  - team: only the AI Team page, view-only. Open to anyone with the link unless
 *    STUDIO_TEAM_PASSWORD is set, in which case that code is needed.
 * The role lives in a signed, httpOnly cookie.
 */
export type StudioRole = "owner" | "team";
export const ACCESS_COOKIE = "cs_access";
const DAYS = 30;

/** Sean's built-in owner passcode, stored only as a slow salted hash (STUDIO_OWNER_PASSWORD replaces it). */
const DEFAULT_OWNER_HASH = "scrypt$17$ndj3jYbpHqy_wxdr1pn4tg$JUbjon0hT4_kpxzAfPsiCdv_G9s9yRehH3VL9zygBLA";

function matchesDefaultOwner(password: string): boolean {
  const [, n, salt, hash] = DEFAULT_OWNER_HASH.split("$");
  const got = scryptSync(password, salt!, 32, { N: 2 ** Number(n), r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return timingSafeEqual(got, Buffer.from(hash!, "base64url"));
}

/**
 * Stable signing key: SESSION_SECRET if set, otherwise a random key kept on the
 * data volume (so it survives restarts and is never derivable from the repo).
 */
let cachedSecret: string | null = null;
function secret(): string {
  const fixed = process.env.SESSION_SECRET?.trim();
  if (fixed) return fixed;
  if (cachedSecret) return cachedSecret;
  const file = path.resolve(process.cwd(), env.dataDir, ".studio-access-key");
  try {
    cachedSecret = fs.readFileSync(file, "utf8").trim();
  } catch {
    /* first run */
  }
  if (!cachedSecret) {
    cachedSecret = randomBytes(32).toString("base64url");
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, cachedSecret, { mode: 0o600 });
    } catch {
      /* read-only disk: key lasts for this process */
    }
  }
  return cachedSecret;
}

export function accessToken(role: StudioRole): string {
  // Bound to the password itself, so changing a password signs everyone with the old one out.
  return signToken({ role, pw: fingerprint(role), exp: Date.now() + DAYS * 86400000 }, secret());
}

export function readAccess(token: string | undefined): StudioRole | null {
  const p = verifyToken<{ role: StudioRole; pw: string }>(token, secret());
  if (!p || (p.role !== "owner" && p.role !== "team")) return null;
  return p.pw === fingerprint(p.role) ? p.role : null;
}

function fingerprint(role: StudioRole): string {
  const pw = role === "owner" ? (env.studioOwnerPassword ?? DEFAULT_OWNER_HASH) : env.studioTeamPassword;
  return pw ? createHash("sha256").update(`${role}:${pw}`).digest("base64url").slice(0, 16) : "";
}

const same = (a: string, b: string) => {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
};

/** Which role a typed password grants, if any. */
export function checkPassword(password: string): StudioRole | null {
  if (env.studioOwnerPassword ? same(password, env.studioOwnerPassword) : matchesDefaultOwner(password)) return "owner";
  if (env.studioTeamPassword && same(password, env.studioTeamPassword)) return "team";
  return null;
}

export const ACCESS_MAX_AGE = DAYS * 86400;

/** Requests a view-only (team) login may make even though they aren't reads. */
export const TEAM_ALLOWED_WRITES: string[] = [];

/** Everything a team (view-only) visitor may open: the AI Team page and what it reads. */
export function teamMayView(pathname: string): boolean {
  return (
    pathname === "/office" ||
    pathname === "/studio/team" ||
    pathname === "/api/studio/team" ||
    pathname.startsWith("/api/studio/agents/") ||
    pathname === "/api/studio/office-render" ||
    pathname.startsWith("/api/studio/office-render/people/")
  );
}
