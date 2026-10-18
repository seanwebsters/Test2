import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, sessionUserId, todayKey } from "@/lib/auth";
import { getSeries } from "@/lib/catalog";
import { toClientState } from "@/lib/client-state";
import { withUser } from "@/lib/store";

const Body = z.object({ slug: z.string().max(80), on: z.boolean() });

export const POST = handler(async (req: Request) => {
  const b = await body(req, Body);
  if (!getSeries(b.slug)) throw new HttpError(404, "Unknown series");
  const { user } = await withUser(await sessionUserId(), (u) => {
    u.favourites = u.favourites.filter((s) => s !== b.slug);
    if (b.on) u.favourites.unshift(b.slug);
  });
  return NextResponse.json({ state: toClientState(user, await todayKey()) });
});
