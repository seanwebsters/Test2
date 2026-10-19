import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { badRequest, notFound } from "@/lib/errors";
import { clearOfficeRender, makeOfficeRender, officePeople, officeRender, officeRenderInfo } from "@/lib/studio/office-render";

export const maxDuration = 300;

/** The photoreal office backdrop (staff only). */
export const GET = route(async (req) => {
  await requireEditor();
  if (new URL(req.url).searchParams.has("info")) return { render: await officeRenderInfo(), people: await officePeople() };
  const r = await officeRender();
  if (!r) throw notFound();
  return new Response(new Uint8Array(r.data), { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=300" } });
});

const Body = z.object({ snapshot: z.string().startsWith("data:image/png;base64,").max(15_000_000) });

/** Make a photoreal render of the office from a snapshot of the illustration (uses the server's fal key). */
export const POST = route(async (req) => {
  await requireEditor();
  const { snapshot } = await parseBody(req, Body);
  try {
    return await makeOfficeRender(Buffer.from(snapshot.slice(snapshot.indexOf(",") + 1), "base64"));
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : String(err));
  }
});

export const DELETE = route(async () => {
  await requireEditor();
  await clearOfficeRender();
  return { ok: true };
});
