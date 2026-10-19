import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { badRequest, notFound } from "@/lib/errors";
import { clearOfficeRender, discardOfficeDraft, makeOfficeRender, officeAnims, officePeople, officeRenderCutout, officeRenderInfo, saveOfficeDraft } from "@/lib/studio/office-render";

export const maxDuration = 300;

/** The 3D office backdrop (saved, or ?draft=1), or ?info=1 for what exists (staff only). */
export const GET = route(async (req) => {
  await requireEditor();
  const q = new URL(req.url).searchParams;
  if (q.has("info")) return { ...(await officeRenderInfo()), people: await officePeople(), anims: await officeAnims() };
  const png = await officeRenderCutout(q.has("draft") ? "draft" : "saved");
  if (!png) throw notFound();
  return new Response(new Uint8Array(png), { headers: { "content-type": "image/png", "cache-control": "private, max-age=3600" } });
});

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), snapshot: z.string().startsWith("data:image/png;base64,").max(15_000_000), prompt: z.string().max(1500).optional() }),
  z.object({ action: z.literal("refine"), prompt: z.string().min(1).max(1500) }),
  z.object({ action: z.literal("save") }),
  z.object({ action: z.literal("discard") }),
]);

/** Generate a draft (from the layout, or by refining the draft with a prompt), then save or discard it. Uses the server's fal key. */
export const POST = route(async (req) => {
  await requireEditor();
  const body = await parseBody(req, Body);
  try {
    if (body.action === "save") return await saveOfficeDraft();
    if (body.action === "discard") return (await discardOfficeDraft(), { ok: true });
    if (body.action === "refine") return await makeOfficeRender({ from: "draft", prompt: body.prompt });
    return await makeOfficeRender({ from: "layout", prompt: body.prompt, snapshot: Buffer.from(body.snapshot.slice(body.snapshot.indexOf(",") + 1), "base64") });
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : String(err));
  }
});

export const DELETE = route(async () => {
  await requireEditor();
  await clearOfficeRender();
  return { ok: true };
});
