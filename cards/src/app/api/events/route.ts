import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { track } from "@/lib/services/core";

/** Client-side analytics events from an allow-list. */
const input = z.object({
  name: z.enum(["card_shared", "card_inspected", "universe_viewed", "trailer_played", "audio_played"]),
  universeId: z.string().max(80).optional(),
  props: z.record(z.union([z.string().max(120), z.number(), z.boolean()])).optional(),
});

export const POST = route({ schema: input, limit: 120 }, async ({ user, body }) => {
  await getStore().transact((d) => track(d, body.name, now(), { userId: user.id, universeId: body.universeId, props: body.props }));
  return { ok: true };
});
