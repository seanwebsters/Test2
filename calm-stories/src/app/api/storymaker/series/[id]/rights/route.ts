import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { body, json, route } from "@/lib/api";
import { declareRights } from "@/lib/storymaker/service";

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const input = await body(req, z.object({ original_work: z.boolean(), ai_assisted: z.boolean(), third_party_material: z.string().max(2000), voice_consent: z.boolean() }));
  return json(await declareRights(await getViewer(), id, input));
}, { limit: 20 });
