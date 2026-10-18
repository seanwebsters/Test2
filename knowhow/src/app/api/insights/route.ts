import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, sessionUserId, todayKey } from "@/lib/auth";
import { getEpisode, scriptFor, transcriptFor } from "@/lib/catalog";
import { toClientState } from "@/lib/client-state";
import { saveInsight } from "@/lib/domain";
import { store, withUser } from "@/lib/store";

const Body = z.object({ episodeId: z.string().max(160), text: z.string().min(3).max(400) });

/** Insights must come from the episode itself: a curated insight or a transcript line. */
export const POST = handler(async (req: Request) => {
  const b = await body(req, Body);
  const id = await sessionUserId();
  let allowed: string[] = [];
  if (b.episodeId.startsWith("ai_")) {
    const seriesId = b.episodeId.slice(0, b.episodeId.lastIndexOf("-"));
    const s = await store.getAiSeries(seriesId);
    const e = s?.ownerId === id ? s.episodes.find((x) => x.id === b.episodeId) : undefined;
    if (e) allowed = [...e.insights, ...e.segments.map((x) => x.text), ...(e.audio?.lines.map((l) => l.text) ?? [])];
  } else if (getEpisode(b.episodeId)) {
    allowed = [...(scriptFor(b.episodeId)?.insights ?? []), ...(transcriptFor(b.episodeId)?.map((l) => l.text) ?? [])];
  }
  if (!allowed.some((t) => t.trim() === b.text.trim() || t.includes(b.text.trim()))) throw new HttpError(400, "Insights must come from the episode");
  const { user, result } = await withUser(id, (u) => {
    if (!b.episodeId.startsWith("ai_") && !u.progress[b.episodeId]) throw new HttpError(403, "Listen to the episode first");
    return saveInsight(u, b.episodeId, b.text, new Date());
  });
  return NextResponse.json({ events: result.events, id: result.id, state: toClientState(user, await todayKey()) });
});

export const DELETE = handler(async (req: Request) => {
  const insightId = new URL(req.url).searchParams.get("id");
  if (!insightId) throw new HttpError(400, "Missing id");
  const { user } = await withUser(await sessionUserId(), (u) => {
    u.insights = u.insights.filter((i) => i.id !== insightId);
  });
  return NextResponse.json({ state: toClientState(user, await todayKey()) });
});
