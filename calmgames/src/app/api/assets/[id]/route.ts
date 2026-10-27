import { z } from "zod";
import { body, ok, route, HttpError } from "@/lib/http";
import { repo } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req, { params }: Ctx) => {
  const store = await repo();
  const id = (await params).id;
  const asset = (await store.listAssets()).find((a) => a.id === id);
  if (!asset) throw new HttpError(404, "Asset not found");
  const patch = await body(req, z.object({ approved: z.boolean().optional(), name: z.string().trim().min(1).max(60).optional() }));
  const next = { ...asset, ...patch };
  await store.putAsset(next);
  return ok({ asset: next });
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  await (await repo()).deleteAsset((await params).id);
  return ok({ deleted: true });
});
