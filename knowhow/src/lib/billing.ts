import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { UserRecord } from "./model";
import { signValue } from "./session";

export const PRODUCTS = {
  plus_monthly: { kind: "subscription", name: "KNOWHOW+ Monthly", pence: 999, credits: 0, blurb: "Unlimited listening, every episode, 5 AI series a month." },
  credits_10: { kind: "credits", name: "10 credits", pence: 199, credits: 10, blurb: "Unlock 3 episodes." },
  credits_30: { kind: "credits", name: "30 credits", pence: 499, credits: 30, blurb: "Unlock 10 episodes. Most popular." },
  credits_80: { kind: "credits", name: "80 credits", pence: 999, credits: 80, blurb: "Unlock 26 episodes. Best value." },
} as const;
export type ProductId = keyof typeof PRODUCTS;

export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);
/** Simulated checkout is the default when Stripe isn't configured. Set ALLOW_SIMULATED_PAYMENTS=0 to disable. */
export const simulatedAllowed = () => !stripeConfigured() && process.env.ALLOW_SIMULATED_PAYMENTS !== "0";

const txId = () => `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Applies a completed purchase. `ref` makes it idempotent (Stripe session id or simulated token). */
export function applyPurchase(u: UserRecord, product: ProductId, provider: "simulated" | "stripe", ref: string, extra?: { customerId?: string; subscriptionId?: string }) {
  if (u.transactions.some((t) => t.id === ref)) return false;
  const p = PRODUCTS[product];
  const now = new Date();
  if (p.kind === "subscription") {
    const renews = new Date(now);
    renews.setMonth(renews.getMonth() + 1);
    u.subscription = {
      status: "active",
      plan: "plus_monthly",
      provider,
      renewsAt: renews.toISOString(),
      stripeCustomerId: extra?.customerId ?? u.subscription.stripeCustomerId,
      stripeSubscriptionId: extra?.subscriptionId ?? u.subscription.stripeSubscriptionId,
    };
    u.transactions.push({ id: ref, at: now.toISOString(), kind: "subscription", credits: 0, amountPence: p.pence, description: `${p.name}${provider === "simulated" ? " (simulated — no payment taken)" : ""}`, provider });
  } else {
    u.credits += p.credits;
    u.transactions.push({ id: ref, at: now.toISOString(), kind: "credit_purchase", credits: p.credits, amountPence: p.pence, description: `${p.name}${provider === "simulated" ? " (simulated — no payment taken)" : ""}`, provider });
  }
  return true;
}

export function cancelSubscription(u: UserRecord) {
  if (u.subscription.status !== "active") return;
  u.subscription.status = "canceled";
  u.transactions.push({ id: txId(), at: new Date().toISOString(), kind: "subscription_cancel", credits: 0, description: "KNOWHOW+ cancelled — access continues until the period ends", provider: u.subscription.provider ?? "system" });
}

// ── Simulated checkout tokens: bind user + product + expiry, so confirmation is explicit and tamper-proof.
export async function simulatedToken(userId: string, product: ProductId) {
  const exp = Date.now() + 10 * 60 * 1000;
  const payload = `${userId}|${product}|${exp}`;
  return `${Buffer.from(payload).toString("base64url")}.${await signValue(`sim:${payload}`)}`;
}

export async function verifySimulatedToken(token: string, userId: string): Promise<ProductId | null> {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const payload = Buffer.from(b64, "base64url").toString();
  if ((await signValue(`sim:${payload}`)) !== sig) return null;
  const [uid, product, exp] = payload.split("|");
  if (uid !== userId || Number(exp) < Date.now() || !(product in PRODUCTS)) return null;
  return product as ProductId;
}

// ── Stripe (REST, no SDK dependency)
async function stripe(path: string, params: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe: ${json?.error?.message ?? res.status}`);
  return json;
}

export async function createStripeCheckout(u: UserRecord, product: ProductId, origin: string) {
  const p = PRODUCTS[product];
  const params: Record<string, string> = {
    mode: p.kind === "subscription" ? "subscription" : "payment",
    client_reference_id: u.id,
    "metadata[product]": product,
    "metadata[user_id]": u.id,
    success_url: `${origin}/wallet?checkout=success`,
    cancel_url: `${origin}/plus?checkout=cancelled`,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "gbp",
    "line_items[0][price_data][unit_amount]": String(p.pence),
    "line_items[0][price_data][product_data][name]": p.name,
  };
  if (p.kind === "subscription") {
    params["line_items[0][price_data][recurring][interval]"] = "month";
    params["subscription_data[metadata][user_id]"] = u.id;
  }
  if (u.subscription.stripeCustomerId) params.customer = u.subscription.stripeCustomerId;
  else if (u.email) params.customer_email = u.email;
  const session = await stripe("checkout/sessions", params);
  return session.url as string;
}

export async function cancelStripeSubscription(subscriptionId: string) {
  await stripe(`subscriptions/${subscriptionId}`, { cancel_at_period_end: "true" });
}

/** Verifies a Stripe webhook signature (v1 scheme, 5 minute tolerance). */
export async function verifyStripeSignature(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`))).toString("hex");
  const candidates = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  return candidates.some((c) => c.length === sig.length && timingSafeEqual(Buffer.from(c), Buffer.from(sig)));
}
