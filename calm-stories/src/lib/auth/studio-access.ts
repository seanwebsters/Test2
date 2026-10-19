import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { signToken, verifyToken } from "./session-token";

/**
 * Password access to the studio, for sharing it safely:
 *  - owner (STUDIO_OWNER_PASSWORD): full control;
 *  - team (STUDIO_TEAM_PASSWORD): can see everything, change nothing.
 * The role lives in a signed, httpOnly cookie.
 */
export type StudioRole = "owner" | "team";
export const ACCESS_COOKIE = "cs_access";
const DAYS = 30;

/** Stable signing key: SESSION_SECRET if set, otherwise derived from the owner password (never a per-process random one). */
function secret(): string {
  return process.env.SESSION_SECRET?.trim() || createHash("sha256").update(`studio-access:${env.studioOwnerPassword ?? ""}`).digest("base64url");
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
  const pw = role === "owner" ? env.studioOwnerPassword : env.studioTeamPassword;
  return pw ? createHash("sha256").update(`${role}:${pw}`).digest("base64url").slice(0, 16) : "";
}

const same = (a: string, b: string) => {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
};

/** Which role a typed password grants, if any. */
export function checkPassword(password: string): StudioRole | null {
  if (env.studioOwnerPassword && same(password, env.studioOwnerPassword)) return "owner";
  if (env.studioTeamPassword && same(password, env.studioTeamPassword)) return "team";
  return null;
}

export const ACCESS_MAX_AGE = DAYS * 86400;

/** Requests a view-only (team) login may make even though they aren't reads. */
export const TEAM_ALLOWED_WRITES = ["/api/studio/ask"];
