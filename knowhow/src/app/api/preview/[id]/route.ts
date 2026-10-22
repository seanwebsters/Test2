import fs from "node:fs/promises";
import path from "node:path";
import { handler } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { audioResponse } from "@/lib/audio-response";
import { getEpisode } from "@/lib/catalog";

/** Hook-only preview clips: free for everyone (Discover). */
export const GET = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const ep = getEpisode(id);
  if (!ep?.hasAudio) throw new HttpError(404, "No preview");
  const data = await fs.readFile(path.join(process.cwd(), "content-audio", "previews", `${id}.mp3`));
  return audioResponse(req, data, "public, max-age=86400");
});
