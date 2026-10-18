import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { HttpError, currentUser, todayKey } from "@/lib/auth";
import { getEpisode, getSeries, scriptFor, transcriptFor } from "@/lib/catalog";
import { episodeAccess } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

/** Access decision + (only when allowed) transcript, insights and challenge. */
export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const ep = getEpisode(id);
  if (!ep) throw new HttpError(404, "Unknown episode");
  const user = await currentUser();
  const access = episodeAccess(user, getSeries(ep.seriesSlug), ep, await todayKey());
  if (!access.ok) return NextResponse.json({ access });
  const script = scriptFor(id);
  return NextResponse.json({
    access,
    lines: transcriptFor(id) ?? [],
    insights: script?.insights ?? [],
    challenge: script?.challenge ? { question: script.challenge.question, options: script.challenge.options } : null,
  });
});
