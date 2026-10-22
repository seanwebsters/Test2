import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, sessionUserId, todayKey } from "@/lib/auth";
import { scriptFor } from "@/lib/catalog";
import { toClientState } from "@/lib/client-state";
import { answerChallenge } from "@/lib/domain";
import { store, withUser } from "@/lib/store";

const Body = z.object({ episodeId: z.string().max(160), choice: z.number().int().min(0).max(10) });

/** Answers are checked server-side; the client never receives the correct index up front. */
export const POST = handler(async (req: Request) => {
  const b = await body(req, Body);
  const id = await sessionUserId();
  let challenge = scriptFor(b.episodeId)?.challenge;
  if (!challenge && b.episodeId.startsWith("ai_")) {
    const seriesId = b.episodeId.slice(0, b.episodeId.lastIndexOf("-"));
    const s = await store.getAiSeries(seriesId);
    if (s?.ownerId === id) challenge = s.episodes.find((e) => e.id === b.episodeId)?.challenge;
  }
  if (!challenge) throw new HttpError(404, "No challenge for this episode");
  const correct = b.choice === challenge.answer;
  const { user, result } = await withUser(id, (u) => {
    if (!b.episodeId.startsWith("ai_") && !u.progress[b.episodeId]) throw new HttpError(403, "Listen to the episode first");
    return answerChallenge(u, b.episodeId, correct, new Date());
  });
  return NextResponse.json({ correct, answer: challenge.answer, explain: challenge.explain, events: result, state: toClientState(user, await todayKey()) });
});
