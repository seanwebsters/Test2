import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, sessionUserId, todayKey } from "@/lib/auth";
import { toClientState } from "@/lib/client-state";
import { findCollection } from "@/lib/collections";
import { store, withUser } from "@/lib/store";

const Body = z.object({ on: z.boolean() });

export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { on } = await body(req, Body);
  const c = await findCollection(id);
  if (!c || (!c.isPublic && c.ownerId !== (await sessionUserId()))) throw new HttpError(404, "Collection not found");
  const { user, result: changed } = await withUser(await sessionUserId(), (u) => {
    const had = u.followedCollections.includes(id);
    u.followedCollections = u.followedCollections.filter((x) => x !== id);
    if (on) u.followedCollections.unshift(id);
    return had !== on;
  });
  if (changed) await store.saveCollection({ ...c, followers: Math.max(0, c.followers + (on ? 1 : -1)) });
  return NextResponse.json({ state: toClientState(user, await todayKey()) });
});
