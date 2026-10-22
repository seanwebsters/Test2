import { NextResponse } from "next/server";
import { PRODUCTS, applyPurchase, verifyStripeSignature, type ProductId } from "@/lib/billing";
import { store, withUser } from "@/lib/store";

/** Stripe webhook: the only path that grants paid access when Stripe is configured. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const raw = await req.text();
  if (!(await verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }
  const event = JSON.parse(raw);
  const obj = event.data?.object ?? {};
  switch (event.type) {
    case "checkout.session.completed": {
      const userId = obj.client_reference_id ?? obj.metadata?.user_id;
      const product = obj.metadata?.product as ProductId;
      if (userId && product in PRODUCTS && obj.payment_status !== "unpaid") {
        await withUser(userId, (u) => applyPurchase(u, product, "stripe", obj.id, { customerId: obj.customer ?? undefined, subscriptionId: obj.subscription ?? undefined }));
      }
      break;
    }
    case "invoice.paid": {
      const u = obj.customer ? await store.findUserByStripeCustomer(obj.customer) : null;
      const end = obj.lines?.data?.[0]?.period?.end;
      if (u && end) await withUser(u.id, (x) => { x.subscription.status = "active"; x.subscription.renewsAt = new Date(end * 1000).toISOString(); });
      break;
    }
    case "customer.subscription.deleted": {
      const u = obj.customer ? await store.findUserByStripeCustomer(obj.customer) : null;
      if (u) await withUser(u.id, (x) => { x.subscription = { ...x.subscription, status: "none", renewsAt: undefined }; });
      break;
    }
  }
  return NextResponse.json({ received: true });
}
