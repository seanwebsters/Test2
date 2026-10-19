import { route } from "@/lib/api";
import { requireEditor } from "@/lib/auth/session";
import { notFound } from "@/lib/errors";
import { getStorage } from "@/lib/storage";

/** Avatar stills and clips for the AI Team room (staff only). */
export const GET = route<{ params: Promise<{ agent: string; file: string }> }>(async (_req, { params }) => {
  await requireEditor();
  const { agent, file } = await params;
  if (!/^[a-z_]+$/.test(agent) || !/^(still\.png|(resting|working|thinking|needs_you)\.mp4)$/.test(file)) throw notFound();
  const f = await getStorage().get(`avatars/${agent}/${file}`);
  if (!f) throw notFound();
  return new Response(new Uint8Array(f.data), { headers: { "content-type": file.endsWith(".mp4") ? "video/mp4" : "image/png", "cache-control": "private, max-age=86400" } });
});
