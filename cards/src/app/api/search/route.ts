import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { iso } from "@/lib/services/core";
import { search } from "@/lib/services/discovery";

export const GET = route({ schema: z.object({ q: z.string().max(80).default(""), record: z.string().optional() }), limit: 120 }, async ({ user, body }) => {
  const at = now();
  if (body.record === "1" && body.q.trim().length >= 2) {
    await getStore().transact((d) => {
      d.searches.push({ userId: user.id, q: body.q.trim().slice(0, 80), at: iso(at) });
      if (d.searches.length > 5000) d.searches.splice(0, d.searches.length - 5000);
    });
  }
  return { hits: search(getStore().read(), body.q, at, undefined, 12) };
});
