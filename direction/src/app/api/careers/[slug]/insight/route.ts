import { getCareer } from "@/lib/content/careers";
import { careerInsight } from "@/lib/server/ai/insight";
import { getViewer } from "@/lib/server/auth";
import { HttpError, handle, json } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const career = getCareer(slug);
  if (!career) throw new HttpError(404, "Career not found.");
  const viewer = await getViewer();
  rateLimit(`insight:${viewer?.userId ?? req.headers.get("x-forwarded-for") ?? "anon"}`, 20, 3600_000);
  return json(await careerInsight(career));
});
