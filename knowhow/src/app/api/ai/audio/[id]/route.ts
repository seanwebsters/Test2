import fs from "node:fs/promises";
import path from "node:path";
import { handler } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { ownedAiEpisode } from "@/lib/ai/access";
import { audioResponse } from "@/lib/audio-response";
import { store } from "@/lib/store";

export const GET = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { episode } = await ownedAiEpisode(id);
  if (!episode.audio) throw new HttpError(404, "This episode has no narrated audio");
  const key = episode.audio.key;
  const data = key.startsWith("demo:")
    ? await fs.readFile(path.join(process.cwd(), "content-audio", `${key.slice(5).replace(/[^a-z0-9-]/g, "")}.mp3`))
    : await store.getAudio(key);
  if (!data) throw new HttpError(404, "Audio missing");
  return audioResponse(req, data);
});
