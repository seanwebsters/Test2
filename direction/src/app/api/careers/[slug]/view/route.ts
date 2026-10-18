import { getViewer } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";
import { recordCareerView } from "@/lib/server/services";

export const POST = handle(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const viewer = await getViewer();
  if (!viewer) return json({ ok: true });
  const { slug } = await ctx.params;
  const unlocked = (await recordCareerView(viewer, slug)) ?? [];
  return json({ newAchievements: unlocked.map((a) => ({ id: a.id, name: a.name, emoji: a.emoji, xp: a.xp })) });
});
