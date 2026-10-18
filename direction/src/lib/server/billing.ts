import "server-only";
import crypto from "node:crypto";
import { localStore, storeFor, type Viewer } from "./context";
import { backend, billingMode, env } from "./env";
import { HttpError } from "./http";
import { adminClient, findUserIdByStripeCustomer, SupabaseStore } from "./store/supabase";
import type { Store } from "./store/types";

function serverStore(): Store {
  if (backend() === "supabase") {
    const admin = adminClient();
    if (!admin) throw new HttpError(503, "Billing webhooks need SUPABASE_SERVICE_ROLE_KEY.");
    return new SupabaseStore(admin);
  }
  return localStore();
}

/** Mock checkout: grants Plus for 30 days. No payment is taken. */
export async function mockUpgrade(viewer: Viewer) {
  if (billingMode() !== "mock") throw new HttpError(400, "Live billing is enabled; use checkout.");
  const renewsAt = new Date(Date.now() + 30 * 86400_000).toISOString();
  await storeFor(viewer).setSubscription(viewer.userId, { plan: "plus", source: "mock", renewsAt, stripeCustomerId: null });
  return { plan: "plus" as const, renewsAt };
}

export async function cancelPlan(viewer: Viewer) {
  const store = storeFor(viewer);
  const profile = await store.getProfile(viewer.userId);
  if (profile?.planSource === "stripe") {
    throw new HttpError(400, "Manage your live subscription from the billing portal link in your receipt email.");
  }
  await store.setSubscription(viewer.userId, { plan: "free", source: "none", renewsAt: null, stripeCustomerId: profile?.stripeCustomerId ?? null });
}

/** Creates a Stripe Checkout session (live billing). */
export async function createCheckout(viewer: Viewer, email: string | null): Promise<string> {
  if (billingMode() !== "stripe") throw new HttpError(400, "Live billing isn't configured.");
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": env.stripePriceId,
    "line_items[0][quantity]": "1",
    client_reference_id: viewer.userId,
    success_url: `${env.appUrl}/plus?success=1`,
    cancel_url: `${env.appUrl}/plus?cancelled=1`,
    allow_promotion_codes: "true",
  });
  if (email) body.set("customer_email", email);
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) throw new HttpError(502, data.error?.message ?? "Couldn't start checkout.");
  return data.url;
}

export function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSec = 300, now = Date.now()): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  const v1 = header
    .split(",")
    .filter((kv) => kv.startsWith("v1="))
    .map((kv) => kv.slice(3));
  if (!t || v1.length === 0) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return v1.some((sig) => sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

interface StripeEvent {
  type: string;
  data: { object: Record<string, unknown> };
}

export async function handleStripeEvent(event: StripeEvent) {
  const store = serverStore();
  const obj = event.data.object;
  if (event.type === "checkout.session.completed") {
    const userId = obj.client_reference_id as string | undefined;
    if (!userId) return;
    await store.setSubscription(userId, { plan: "plus", source: "stripe", renewsAt: null, stripeCustomerId: (obj.customer as string) ?? null });
    return;
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const customer = obj.customer as string;
    const userId = backend() === "supabase" ? await findUserIdByStripeCustomer(customer) : await localStore().findUserIdByStripeCustomer(customer);
    if (!userId) return;
    const status = obj.status as string;
    const active = event.type !== "customer.subscription.deleted" && ["active", "trialing", "past_due"].includes(status);
    const periodEnd = obj.current_period_end as number | undefined;
    await store.setSubscription(userId, {
      plan: active ? "plus" : "free",
      source: active ? "stripe" : "none",
      renewsAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      stripeCustomerId: customer,
    });
  }
}
