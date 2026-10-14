import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { checkContinuity, checkSleepSuitability } from "@/lib/storymaker/service";

export const maxDuration = 120;

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const input = await body(req, z.object({ kind: z.enum(["continuity", "sleep"]), text: z.string().max(200_000).optional() }));
  const viewer = await getViewer();
  if (input.kind === "continuity") return json({ continuity: await checkContinuity(viewer, id, input.text) });
  return json({ sleep: await checkSleepSuitability(viewer, id, input.text) });
}, { limit: 30, bucket: "storymaker-checks" });
