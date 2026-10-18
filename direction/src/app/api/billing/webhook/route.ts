import { handleStripeEvent, verifyStripeSignature } from "@/lib/server/billing";
import { env } from "@/lib/server/env";
import { HttpError, handle, json } from "@/lib/server/http";

export const POST = handle(async (req: Request) => {
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), env.stripeWebhookSecret)) {
    throw new HttpError(400, "Invalid signature.");
  }
  await handleStripeEvent(JSON.parse(payload));
  return json({ received: true });
});
