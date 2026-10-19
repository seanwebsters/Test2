import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { notFound } from "@/lib/errors";
import { officeSprite } from "@/lib/studio/office-render";

/** A 3D team member sprite (staff only). */
export const GET = route<{ params: Promise<{ file: string }> }>(async (_req, { params }) => {
  await requireEditor();
  const data = await officeSprite((await params).file);
  if (!data) throw notFound();
  return new Response(new Uint8Array(data), { headers: { "content-type": "image/png", "cache-control": "private, max-age=300" } });
});
