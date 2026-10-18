import "server-only";
import crypto from "node:crypto";
import { env } from "./env";

export const SESSION_COOKIE = "dir_session";
export const SB_ACCESS_COOKIE = "dir_sb_access";
export const SB_REFRESH_COOKIE = "dir_sb_refresh";
export const SESSION_TTL_DAYS = 30;

function sign(payload: string): string {
  return crypto.createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
}

/** `uid.exp.signature` — tamper-evident, stateless session token for local auth. */
export function createSessionToken(userId: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + SESSION_TTL_DAYS * 86400;
  const payload = `${Buffer.from(userId).toString("base64url")}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [uid, exp, sig] = parts as [string, string, string];
  const expected = sign(`${uid}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(exp) * 1000 < now) return null;
  try {
    return Buffer.from(uid, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, "base64"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeSeconds,
});

/** Reads the `exp` claim of a JWT without verifying it (verification happens at Supabase). */
export function jwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: number };
    return payload.exp ?? null;
  } catch {
    return null;
  }
}
