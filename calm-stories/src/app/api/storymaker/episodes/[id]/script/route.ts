import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { getScriptBundle, saveScript, updateScriptSettings } from "@/lib/storymaker/service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  return json(await getScriptBundle(await getViewer(), id));
});

/** Saves the editor's text as a new version (earlier versions are kept). */
export const PUT = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const input = await body(req, z.object({ content: z.string().max(200_000), note: z.string().max(200).optional(), source: z.enum(["human", "ai_rewrite"]).optional() }));
  const viewer = await getViewer();
  await saveScript(viewer, id, input.content, input.note, input.source);
  return json(await getScriptBundle(viewer, id));
}, { limit: 60 });

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const { settings } = await body(
    req,
    z.object({
      settings: z
        .object({
          duration_minutes: z.number().int().min(5).max(60),
          mood: z.enum(["dreamy", "cosy", "wistful", "wonder", "tender"]),
          perspective: z.enum(["third", "first", "second"]),
          style: z.enum(["lyrical", "storybook", "literary", "minimal"]),
          dialogue: z.enum(["none", "light", "moderate"]),
          romance: z.enum(["none", "gentle", "warm"]),
          pacing: z.enum(["very-slow", "slow", "gentle"]),
        })
        .partial(),
    }),
  );
  return json(await updateScriptSettings(await getViewer(), id, settings));
});
