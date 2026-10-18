/**
 * Edge-safe signed session tokens: `<userId>.<hmac>`. Used by middleware
 * (Web Crypto) and by server code.
 */
export const SESSION_COOKIE = "nx_session";

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set in production");
  return "nexara-dev-secret-change-me";
}

const enc = new TextEncoder();

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
  let out = "";
  for (const b of sig) out += b.toString(16).padStart(2, "0");
  return out.slice(0, 32);
}

export async function signToken(userId: string, secret = sessionSecret()) {
  return `${userId}.${await hmac(userId, secret)}`;
}

export async function verifyToken(token: string | undefined, secret = sessionSecret()): Promise<string | undefined> {
  if (!token) return undefined;
  const i = token.lastIndexOf(".");
  if (i <= 0) return undefined;
  const id = token.slice(0, i);
  if (!/^usr_[A-Za-z0-9_]{6,60}$/.test(id)) return undefined;
  const expected = await hmac(id, secret);
  const got = token.slice(i + 1);
  if (got.length !== expected.length) return undefined;
  let diff = 0;
  for (let k = 0; k < got.length; k++) diff |= got.charCodeAt(k) ^ expected.charCodeAt(k);
  return diff === 0 ? id : undefined;
}

export function newGuestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let s = "";
  for (const b of bytes) s += b.toString(36).padStart(2, "0");
  return `usr_g${s.slice(0, 20)}`;
}
