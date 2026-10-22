import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { HttpError, currentUser, todayKey } from "@/lib/auth";
import { audioResponse } from "@/lib/audio-response";
import { getEpisode, getSeries } from "@/lib/catalog";
import { episodeAccess } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

/** Full episodes live outside /public and are only served after a server-side entitlement check. */
export const GET = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const ep = getEpisode(id);
  if (!ep) throw new HttpError(404, "Unknown episode");
  const user = await currentUser();
  const access = episodeAccess(user, getSeries(ep.seriesSlug), ep, await todayKey());
  if (!access.ok) {
    const started = Boolean(user.progress[id]);
    if (!(access.reason === "daily_limit" && started)) return NextResponse.json({ error: "Locked", code: access.reason }, { status: 402 });
  }
  const data = await fs.readFile(path.join(process.cwd(), "content-audio", `${id}.mp3`));
  return audioResponse(req, data);
});
