import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { sessionUserId, todayKey } from "@/lib/auth";
import { cancelStripeSubscription, cancelSubscription } from "@/lib/billing";
import { toClientState } from "@/lib/client-state";
import { store, withUser } from "@/lib/store";

export const POST = handler(async () => {
  const id = await sessionUserId();
  const existing = await store.getUser(id);
  if (existing?.subscription.provider === "stripe" && existing.subscription.stripeSubscriptionId) {
    await cancelStripeSubscription(existing.subscription.stripeSubscriptionId);
  }
  const { user } = await withUser(id, cancelSubscription);
  return NextResponse.json({ state: toClientState(user, await todayKey()) });
});
