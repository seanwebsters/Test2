import { ok, route, HttpError } from "@/lib/http";
import { repo } from "@/lib/store";
import { newId, nowIso } from "@/lib/ids";

export const POST = route(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const store = await repo();
  const id = (await params).id;
  const game = await store.getGame(id);
  if (!game) throw new HttpError(404, "Game not found");
  const now = nowIso();
  const copy = { ...game, id: newId("game"), name: `${game.name} (copy)`, origin: game.origin, activeJobId: undefined, createdAt: now, updatedAt: now };
  await store.putGame(copy);
  for (const v of await store.listVersions(id)) await store.putVersion({ ...v, gameId: copy.id, jobId: undefined });
  const thumb = await store.getThumbnail(id);
  if (thumb) await store.putThumbnail(copy.id, thumb);
  return ok({ game: copy }, { status: 201 });
});
