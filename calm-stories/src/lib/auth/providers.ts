import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import type { Plan } from "@/lib/types";
import { verifyToken } from "./session-token";

export const SESSION_COOKIE = "cs_session";
/** Set by /dev: temporary open access to the studio as Calm Editorial (demo deployments only). */
export const DEV_COOKIE = "cs_dev";
export const DEV_USER_ID = "usr_calm-editor";

/**
 * Identity provider boundary. Swap the demo provider for Calm's identity
 * service (or Supabase Auth) without touching the rest of the app.
 */
export interface AuthProvider {
  readonly name: string;
  /** Resolve the signed-in user id from request cookies. */
  resolveUserId(cookies: { get(name: string): { value: string } | undefined }): Promise<string | null>;
}

/** Signed demo session cookie – lets reviewers switch between personas. */
export class DemoAuthProvider implements AuthProvider {
  readonly name = "demo";
  async resolveUserId(cookies: { get(name: string): { value: string } | undefined }) {
    const payload = verifyToken<{ uid: string }>(cookies.get(SESSION_COOKIE)?.value, env.sessionSecret);
    if (payload?.uid) return payload.uid;
    // Temporary open dev access (footer "dev" link). Turn off with DEV_ACCESS=off.
    if (env.devAccess && cookies.get(DEV_COOKIE)?.value === "1") return DEV_USER_ID;
    return null;
  }
}

/**
 * Supabase Auth: validates the access token cookie set by @supabase/ssr and
 * maps the auth user to an application user by email.
 */
export class SupabaseAuthProvider implements AuthProvider {
  readonly name = "supabase";
  async resolveUserId(cookies: { get(name: string): { value: string } | undefined }) {
    if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
    const token = cookies.get("sb-access-token")?.value;
    if (!token) return null;
    const client = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false } });
    const { data } = await client.auth.getUser(token);
    const email = data.user?.email;
    if (!email) return null;
    const user = await getDb().findOne("users", { email });
    return user?.id ?? null;
  }
}

export function getAuthProvider(): AuthProvider {
  return env.authProvider === "supabase" ? new SupabaseAuthProvider() : new DemoAuthProvider();
}

/**
 * Subscription entitlement boundary. The prototype reads mock entitlements
 * from the database; production should call Calm's subscription service.
 * Calm Stories never sells anything itself – it only checks entitlement.
 */
export interface EntitlementProvider {
  readonly name: string;
  getPlan(userId: string): Promise<Plan>;
}

export class MockEntitlementProvider implements EntitlementProvider {
  readonly name = "mock";
  async getPlan(userId: string): Promise<Plan> {
    const ent = await getDb().findOne("subscription_entitlements", { user_id: userId, status: "active" });
    if (!ent) return "free";
    if (ent.expires_at && new Date(ent.expires_at) < new Date()) return "free";
    return ent.plan;
  }
}

/**
 * Adapter for Calm's entitlement API. Expected contract:
 *   GET {CALM_ENTITLEMENTS_URL}/users/{id}/entitlements -> { premium: boolean }
 */
export class CalmEntitlementProvider implements EntitlementProvider {
  readonly name = "calm";
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}
  async getPlan(userId: string): Promise<Plan> {
    const res = await fetch(`${this.baseUrl}/users/${encodeURIComponent(userId)}/entitlements`, {
      headers: { authorization: `Bearer ${this.apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) return "free";
    const body = (await res.json()) as { premium?: boolean };
    return body.premium ? "premium" : "free";
  }
}

export function getEntitlementProvider(): EntitlementProvider {
  const url = process.env.CALM_ENTITLEMENTS_URL;
  const key = process.env.CALM_ENTITLEMENTS_API_KEY;
  if (url && key) return new CalmEntitlementProvider(url, key);
  return new MockEntitlementProvider();
}
