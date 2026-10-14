import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/db";
import type { SubscriptionEntitlement, User } from "@/lib/types";
import { verifySession } from "./session";

/**
 * Resolves the signed-in user from the request cookies.
 * - "demo": a signed cookie naming one of the seeded demo users.
 * - "supabase": a Supabase Auth access token (sb-access-token cookie),
 *   mapped to a users row with the same id.
 * Calm's production identity service would be a third implementation.
 */
export interface IdentityProvider {
  readonly name: string;
  resolveUserId(cookies: { get(name: string): { value: string } | undefined }): Promise<string | null>;
}

export const demoIdentity: IdentityProvider = {
  name: "demo",
  async resolveUserId(cookies) {
    return verifySession(cookies.get("calm_session")?.value);
  },
};

export const supabaseIdentity: IdentityProvider = {
  name: "supabase",
  async resolveUserId(cookies) {
    const token = cookies.get("sb-access-token")?.value;
    if (!token || !env.supabaseUrl || !env.supabaseAnonKey) return null;
    const client = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  },
};

export function identityProvider(): IdentityProvider {
  return env.authProvider === "supabase" ? supabaseIdentity : demoIdentity;
}

/**
 * Answers "does this user have Calm Premium?". The prototype reads mock rows
 * from subscription_entitlements; production would call Calm's existing
 * subscription service. Billing is intentionally NOT implemented here.
 */
export interface EntitlementProvider {
  readonly name: string;
  activeEntitlement(db: Database, user: User): Promise<SubscriptionEntitlement | null>;
}

export const mockEntitlements: EntitlementProvider = {
  name: "mock",
  async activeEntitlement(db, user) {
    const rows = await db.list("subscription_entitlements", { where: { user_id: user.id, status: "active" } });
    const now = Date.now();
    return rows.find((r) => !r.expires_at || new Date(r.expires_at).getTime() > now) ?? null;
  },
};
