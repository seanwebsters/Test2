import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { hourIn, sessionUserId, todayKey } from "@/lib/auth";
import { ownedAiEpisode } from "@/lib/ai/access";
import { toClientState } from "@/lib/client-state";
import { recordAiProgress } from "@/lib/domain";
import { TZ_COOKIE } from "@/lib/session";
import { withUser } from "@/lib/store";

const Body = z.object({ episodeId: z.string().max(120), position: z.number().min(0).max(36000), completed: z.boolean().optional(), duration: z.number().min(1).max(36000).optional() });

export const POST = handler(async (req: Request) => {
  const b = await body(req, Body);
  const { episode } = await ownedAiEpisode(b.episodeId);
  // Browser-voice episodes have no file; their length is estimated from the word count.
  const words = episode.segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0);
  const duration = episode.audio?.duration ?? Math.max(30, Math.round(words / 2.6));
  const now = new Date();
  const today = await todayKey(now);
  const hour = hourIn(now, (await cookies()).get(TZ_COOKIE)?.value);
  const { user, result } = await withUser(await sessionUserId(), (u) => recordAiProgress(u, episode.id, episode.title, duration, b, now, today, hour));
  return NextResponse.json({ events: result, state: toClientState(user, today) });
});
