import { NextResponse, after } from "next/server";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, currentUser, todayKey } from "@/lib/auth";
import { GenerationRefused, createGeneration } from "@/lib/ai/pipeline";
import { store } from "@/lib/store";

export const maxDuration = 300;

const Body = z.object({ prompt: z.string().trim().min(4, "Tell us a bit more").max(200) });

export const POST = handler(async (req: Request) => {
  const { prompt } = await body(req, Body);
  const user = await currentUser();
  const month = (await todayKey()).slice(0, 7);
  try {
    const { job, run } = await createGeneration(user, prompt, month);
    if (run) after(run);
    return NextResponse.json(job);
  } catch (e) {
    if (e instanceof GenerationRefused) throw new HttpError(402, e.message, "allowance");
    throw e;
  }
});

/** Summaries of the listener's personal AI series. */
export const GET = handler(async () => {
  const user = await currentUser();
  const all = await Promise.all(user.aiSeries.map((id) => store.getAiSeries(id)));
  return NextResponse.json(
    all.filter((s) => s && s.ownerId === user.id).map((s) => ({ id: s!.id, title: s!.title, tagline: s!.tagline, art: s!.art, mode: s!.mode, prompt: s!.prompt, category: s!.category, episodes: s!.episodes.length, createdAt: s!.createdAt, episodeIds: s!.episodes.map((e) => e.id) })),
  );
});
