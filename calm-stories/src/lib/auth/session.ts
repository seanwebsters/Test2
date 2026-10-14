import "server-only";
import crypto from "node:crypto";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "calm_session";

/** Signs a user id into a tamper-proof cookie value (HMAC-SHA256). */
export function signSession(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(value: string | undefined | null): string | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { uid?: unknown };
    return typeof parsed.uid === "string" ? parsed.uid : null;
  } catch {
    return null;
  }
}
