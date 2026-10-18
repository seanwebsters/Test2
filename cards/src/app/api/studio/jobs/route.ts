import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { createJobTx } from "@/lib/studio/engine";

export const GET = route({ admin: true, schema: z.object({ id: z.string().max(60) }) }, async ({ body }) => {
  const job = getStore().read().jobs.find((j) => j.id === body.id);
  return { job: job ?? null };
});

export const POST = route({ admin: true, limit: 20, schema: z.object({ brief: z.string().max(2000) }) }, async ({ user, body }) => ({
  job: await getStore().transact((d) => createJobTx(d, user.id, body.brief, now())),
}));
