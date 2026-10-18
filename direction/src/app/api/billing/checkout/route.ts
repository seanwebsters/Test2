import { requireViewer } from "@/lib/server/auth";
import { createCheckout, mockUpgrade } from "@/lib/server/billing";
import { billingMode } from "@/lib/server/env";
import { assertSameOrigin, handle, json } from "@/lib/server/http";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const viewer = await requireViewer();
  if (billingMode() === "mock") return json({ mode: "mock", ...(await mockUpgrade(viewer)) });
  return json({ mode: "stripe", url: await createCheckout(viewer, viewer.email) });
});
