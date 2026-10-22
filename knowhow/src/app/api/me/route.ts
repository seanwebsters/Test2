import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { HttpError, currentUser, sessionUserId, todayKey } from "@/lib/auth";
import { toClientState } from "@/lib/client-state";
import { store, withUser } from "@/lib/store";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await currentUser();
  return NextResponse.json(toClientState(user, await todayKey()));
});

const Patch = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9._]{3,24}$/, "3–24 letters, numbers, dots or underscores").optional(),
  bio: z.string().max(160).optional(),
  isPublic: z.boolean().optional(),
});

export const PATCH = handler(async (req: Request) => {
  const id = await sessionUserId();
  const patch = await body(req, Patch);
  if (patch.handle) {
    const owner = await store.findUserByHandle(patch.handle);
    if (owner && owner.id !== id) throw new HttpError(409, "That handle is taken");
  }
  const { user } = await withUser(id, (u) => {
    Object.assign(u, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
  });
  return NextResponse.json({ state: toClientState(user, await todayKey()) });
});
