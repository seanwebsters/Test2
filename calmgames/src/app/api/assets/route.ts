import { z } from "zod";
import { body, ok, route, HttpError } from "@/lib/http";
import { repo } from "@/lib/store";
import { newId, nowIso } from "@/lib/ids";
import { sanitizeSvg } from "@/lib/svg";

export const GET = route(async () => ok({ assets: await (await repo()).listAssets() }));

const schema = z.object({ name: z.string().trim().min(1).max(60), mime: z.enum(["image/svg+xml", "image/png", "image/jpeg", "image/webp"]), data: z.string().max(2_800_000) });

/** Import an approved asset. Raster images arrive as data: URLs; SVG as markup. */
export const POST = route(async (req) => {
  const input = await body(req, schema);
  let data = input.data;
  if (input.mime === "image/svg+xml") {
    const clean = sanitizeSvg(input.data);
    if (!clean) throw new HttpError(400, "That file is not a usable SVG (or is over 12 KB after clean-up).");
    data = clean;
  } else if (!data.startsWith(`data:${input.mime};base64,`)) throw new HttpError(400, "Expected a base64 data URL");
  const asset = { id: newId("asset"), name: input.name, kind: input.mime === "image/svg+xml" ? ("svg" as const) : ("image" as const), mime: input.mime, data, source: "imported" as const, approved: true, createdAt: nowIso() };
  await (await repo()).putAsset(asset);
  return ok({ asset }, { status: 201 });
});
