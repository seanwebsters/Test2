import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, sessionUserId, todayKey } from "@/lib/auth";
import { getEpisode, getSeries } from "@/lib/catalog";
import { toClientState } from "@/lib/client-state";
import { UNLOCK_COST, isFreeEpisode, isPlus } from "@/lib/entitlements";
import { withUser } from "@/lib/store";

const Body = z.object({ episodeId: z.string().max(120) });

/** Spends credits to permanently unlock one premium episode. */
export const POST = handler(async (req: Request) => {
  const b = await body(req, Body);
  const ep = getEpisode(b.episodeId);
  if (!ep) throw new HttpError(404, "Unknown episode");
  if (ep.status !== "released") throw new HttpError(400, "This episode isn't out yet");
  const series = getSeries(ep.seriesSlug);
  const { user } = await withUser(await sessionUserId(), (u) => {
    if (isPlus(u)) throw new HttpError(400, "KNOWHOW+ already includes this episode");
    if (isFreeEpisode(series, ep) || u.unlocked.includes(ep.id)) return;
    if (u.credits < UNLOCK_COST) throw new HttpError(402, "Not enough credits", "insufficient_credits");
    u.credits -= UNLOCK_COST;
    u.unlocked.push(ep.id);
    u.transactions.push({ id: `t_${Date.now().toString(36)}`, at: new Date().toISOString(), kind: "credit_spend", credits: -UNLOCK_COST, description: `Unlocked ${series.title} · Ep ${ep.n}`, provider: "system" });
  });
  return NextResponse.json({ state: toClientState(user, await todayKey()) });
});
