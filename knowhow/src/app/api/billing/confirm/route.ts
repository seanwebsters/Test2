import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, sessionUserId, todayKey } from "@/lib/auth";
import { applyPurchase, simulatedAllowed, verifySimulatedToken } from "@/lib/billing";
import { toClientState } from "@/lib/client-state";
import { withUser } from "@/lib/store";

const Body = z.object({ token: z.string().max(400), confirm: z.literal(true) });

/** Completes a SIMULATED purchase after the listener explicitly confirms. No money moves. */
export const POST = handler(async (req: Request) => {
  if (!simulatedAllowed()) throw new HttpError(403, "Simulated checkout is disabled");
  const b = await body(req, Body);
  const id = await sessionUserId();
  const product = await verifySimulatedToken(b.token, id);
  if (!product) throw new HttpError(400, "This checkout expired. Please try again.");
  const { user } = await withUser(id, (u) => applyPurchase(u, product, "simulated", `sim_${b.token.slice(-16)}`));
  return NextResponse.json({ state: toClientState(user, await todayKey()) });
});
