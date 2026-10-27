import { z } from "zod";
import { body, ok, route, HttpError } from "@/lib/http";
import { repo } from "@/lib/store";
import { nowIso } from "@/lib/ids";

const schema = z.object({ label: z.string().trim().max(60).optional(), saved: z.boolean().optional() });

/** "Save version": name a version, pin it, and make it the one the library plays. */
export const PATCH = route(async (req, { params }: { params: Promise<{ id: string; n: string }> }) => {
  const store = await repo();
  const { id, n } = await params;
  const version = await store.getVersion(id, Number(n));
  if (!version) throw new HttpError(404, "Version not found");
  const patch = await body(req, schema);
  const next = { ...version, ...patch };
  await store.putVersion(next);
  const game = (await store.getGame(id))!;
  if (patch.saved) await store.putGame({ ...game, currentVersion: version.number, updatedAt: nowIso() });
  return ok({ version: next });
});
