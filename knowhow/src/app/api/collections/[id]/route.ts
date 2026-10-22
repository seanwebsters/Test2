import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, sessionUserId } from "@/lib/auth";
import { SERIES_BY_SLUG } from "@/lib/catalog";
import { findCollection } from "@/lib/collections";
import { store } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

async function owned(id: string) {
  const uid = await sessionUserId();
  const c = await findCollection(id);
  if (!c) throw new HttpError(404, "Collection not found");
  if (c.ownerId !== uid) throw new HttpError(403, "Not your collection");
  return c;
}

const Patch = z.object({
  title: z.string().trim().min(3).max(60).optional(),
  description: z.string().trim().max(200).optional(),
  isPublic: z.boolean().optional(),
  add: z.string().optional(),
  remove: z.string().optional(),
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const c = await owned(id);
  const b = await body(req, Patch);
  if (b.title !== undefined) c.title = b.title;
  if (b.description !== undefined) c.description = b.description;
  if (b.isPublic !== undefined) c.isPublic = b.isPublic;
  if (b.add && SERIES_BY_SLUG[b.add] && !c.seriesSlugs.includes(b.add)) c.seriesSlugs.push(b.add);
  if (b.remove) c.seriesSlugs = c.seriesSlugs.filter((s) => s !== b.remove);
  c.updatedAt = new Date().toISOString();
  await store.saveCollection(c);
  return NextResponse.json(c);
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  await owned(id);
  await store.deleteCollection(id);
  return NextResponse.json({ ok: true });
});
