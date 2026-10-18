import { z } from "zod";
import { now } from "@/lib/clock";
import { route } from "@/lib/api";
import { getStore } from "@/lib/db";
import { completeOnboardingTx, onboardingInput, setGenresTx } from "@/lib/services/users";

export const POST = route({ schema: z.object({ genres: onboardingInput.shape.genres.optional(), complete: z.boolean().optional() }) }, async ({ user, body }) => {
  await getStore().transact((d) => {
    if (body.genres) setGenresTx(d, user.id, body.genres, now());
    if (body.complete) completeOnboardingTx(d, user.id, now());
  });
  return { ok: true };
});
