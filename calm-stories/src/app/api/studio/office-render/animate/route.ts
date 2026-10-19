import { z } from "zod";
import { parseBody, route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { badRequest } from "@/lib/errors";
import { serveStoredAudio } from "@/lib/storage/serve";
import { discardOfficeAnimation, officeAnimInfo, officeAnimKey, saveOfficeAnimation, startOfficeAnimation } from "@/lib/studio/office-render";

/** The animated office clip (saved, or ?draft=1), or ?info=1 for its status (staff only). */
export const GET = route(async (req) => {
  await requireEditor();
  const q = new URL(req.url).searchParams;
  if (q.has("info")) return await officeAnimInfo();
  return serveStoredAudio(req, officeAnimKey(q.has("draft") ? "draft" : "saved"), "video/mp4");
});

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), still: z.string().startsWith("data:image/").max(15_000_000), prompt: z.string().min(1).max(1500) }),
  z.object({ action: z.literal("save") }),
  z.object({ action: z.literal("discard") }),
]);

/** Animate the 3D office with a motion prompt (Kling on fal, server-side key), then save or discard the clip. */
export const POST = route(async (req) => {
  await requireEditor();
  const body = await parseBody(req, Body);
  try {
    if (body.action === "save") return (await saveOfficeAnimation(), { ok: true });
    if (body.action === "discard") return (await discardOfficeAnimation(), { ok: true });
    return await startOfficeAnimation(Buffer.from(body.still.slice(body.still.indexOf(",") + 1), "base64"), body.prompt);
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : String(err));
  }
});
