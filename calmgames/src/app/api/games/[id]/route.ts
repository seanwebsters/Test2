import { z } from "zod";
import { body, ok, route, HttpError } from "@/lib/http";
import { repo } from "@/lib/store";
import { reconcile } from "@/lib/orchestrator";
import { nowIso } from "@/lib/ids";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req, { params }: Ctx) => {
  const store = await repo();
  const id = (await params).id;
  const game = await store.getGame(id);
  if (!game) throw new HttpError(404, "Game not found");
  const versions = await store.listVersions(id);
  const job = game.activeJobId ? await store.getJob(game.activeJobId) : null;
  const ids = new Set(versions.flatMap((v) => v.assetIds));
  const assets = (await store.listAssets()).filter((a) => ids.has(a.id));
  return ok({ game, versions, job: job ? await reconcile(job) : null, assets });
});

const patchSchema = z.object({ name: z.string().trim().min(1).max(80).optional(), currentVersion: z.number().int().min(1).optional() });

export const PATCH = route(async (req, { params }: Ctx) => {
  const store = await repo();
  const id = (await params).id;
  const game = await store.getGame(id);
  if (!game) throw new HttpError(404, "Game not found");
  const patch = await body(req, patchSchema);
  if (patch.currentVersion && !(await store.getVersion(id, patch.currentVersion))) throw new HttpError(400, "No such version");
  const next = { ...game, ...patch, updatedAt: nowIso() };
  await store.putGame(next);
  return ok({ game: next });
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const store = await repo();
  const id = (await params).id;
  for (const a of (await store.listAssets()).filter((x) => x.gameId === id && x.source !== "imported")) await store.deleteAsset(a.id);
  await store.deleteGame(id);
  return ok({ deleted: id });
});
