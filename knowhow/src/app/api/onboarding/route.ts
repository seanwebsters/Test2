import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, body } from "@/lib/api";
import { sessionUserId, todayKey } from "@/lib/auth";
import { toClientState } from "@/lib/client-state";
import { completeOnboarding } from "@/lib/domain";
import { withUser } from "@/lib/store";
import { CATEGORIES } from "@/content/categories";

const Body = z.object({
  interests: z.array(z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]])).max(10),
  learnStyle: z.enum(["quick", "deep", "mix"]),
  displayName: z.string().max(40).optional(),
});

export const POST = handler(async (req: Request) => {
  const b = await body(req, Body);
  const { user } = await withUser(await sessionUserId(), (u) => completeOnboarding(u, b.interests as never, b.learnStyle, b.displayName));
  return NextResponse.json({ state: toClientState(user, await todayKey()) });
});
