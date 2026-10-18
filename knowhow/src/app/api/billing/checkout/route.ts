import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, currentUser } from "@/lib/auth";
import { PRODUCTS, createStripeCheckout, simulatedAllowed, simulatedToken, stripeConfigured, type ProductId } from "@/lib/billing";
import { isPlus } from "@/lib/entitlements";

const Body = z.object({ product: z.enum(Object.keys(PRODUCTS) as [ProductId, ...ProductId[]]) });

export const POST = handler(async (req: Request) => {
  const { product } = await body(req, Body);
  const user = await currentUser();
  if (product === "plus_monthly" && isPlus(user) && user.subscription.status === "active") throw new HttpError(400, "You're already on KNOWHOW+");
  if (stripeConfigured()) {
    const url = await createStripeCheckout(user, product, new URL(req.url).origin);
    return NextResponse.json({ mode: "stripe", url });
  }
  if (!simulatedAllowed()) throw new HttpError(503, "Payments aren't configured on this server");
  return NextResponse.json({ mode: "simulated", token: await simulatedToken(user.id, product), product: { id: product, ...PRODUCTS[product] } });
});
