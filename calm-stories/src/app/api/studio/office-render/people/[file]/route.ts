import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { notFound } from "@/lib/errors";
import { officeAnimClip, officeSprite } from "@/lib/studio/office-render";

/** A 3D team member sprite or their animated clip (staff only). */
export const GET = route<{ params: Promise<{ file: string }> }>(async (_req, { params }) => {
  await requireEditor();
  const file = (await params).file;
  const webm = file.endsWith(".webm");
  const data = webm ? await officeAnimClip(file) : await officeSprite(file);
  if (!data) throw notFound();
  return new Response(new Uint8Array(data), { headers: { "content-type": webm ? "video/webm" : "image/png", "cache-control": "private, max-age=300" } });
});
