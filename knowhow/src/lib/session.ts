/**
 * Signed session cookie, shared by middleware (edge) and route handlers (node).
 * Value: `<userId>.<base64url hmac>`. Guests get a random id on first visit;
 * Supabase sign-in swaps it for `sb_<supabase user id>`.
 */
export const SESSION_COOKIE = "kh_session";
export const TZ_COOKIE = "kh_tz";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production" && process.env.KNOWHOW_DEMO !== "1") {
    console.warn("[knowhow] SESSION_SECRET is not set; using an insecure development secret.");
  }
  return s || "knowhow-dev-secret-change-me";
}

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer) {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}

export async function signSession(userId: string) {
  return `${userId}.${await hmac(userId)}`;
}

export async function verifySession(cookie: string | undefined): Promise<string | null> {
  if (!cookie) return null;
  const i = cookie.lastIndexOf(".");
  if (i <= 0) return null;
  const id = cookie.slice(0, i);
  if (!/^[a-zA-Z0-9_-]{6,80}$/.test(id)) return null;
  const sig = cookie.slice(i + 1);
  const expected = await hmac(id);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let k = 0; k < sig.length; k++) diff |= sig.charCodeAt(k) ^ expected.charCodeAt(k);
  return diff === 0 ? id : null;
}

export function newGuestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "g_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export { hmac as signValue };
