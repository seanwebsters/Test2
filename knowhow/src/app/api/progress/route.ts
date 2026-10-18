import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, hourIn, sessionUserId, todayKey } from "@/lib/auth";
import { CATALOG, getEpisode, getSeries } from "@/lib/catalog";
import { toClientState } from "@/lib/client-state";
import { recordProgress } from "@/lib/domain";
import { episodeAccess } from "@/lib/entitlements";
import { TZ_COOKIE } from "@/lib/session";
import { withUser } from "@/lib/store";

const Body = z.object({ episodeId: z.string().max(120), position: z.number().min(0).max(36000), completed: z.boolean().optional() });

export const POST = handler(async (req: Request) => {
  const b = await body(req, Body);
  const ep = getEpisode(b.episodeId);
  if (!ep) throw new HttpError(404, "Unknown episode");
  const series = getSeries(ep.seriesSlug);
  const now = new Date();
  const today = await todayKey(now);
  const hour = hourIn(now, (await cookies()).get(TZ_COOKIE)?.value);
  const { user, result } = await withUser(await sessionUserId(), (u) => {
    const prior = u.progress[ep.id];
    // Progress can only be recorded for episodes the listener may play right now.
    const access = episodeAccess(u, series, ep, today, now);
    if (!access.ok && !(prior && access.reason === "daily_limit")) throw new HttpError(403, "No access to this episode", access.reason);
    return recordProgress(u, CATALOG, ep, b, now, today, hour);
  });
  return NextResponse.json({ events: result, state: toClientState(user, today) });
});
