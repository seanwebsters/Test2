import { getDb } from "@/lib/db";
import { isPublicStory } from "@/lib/services/public-stories";
import { serveStoredAudio } from "@/lib/storage/serve";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "range", "access-control-expose-headers": "content-length, content-range, accept-ranges" };

/** Public audio for approved stories only (anything else is 404). Supports Range for seeking. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const ep = await db.get("episodes", id);
  const asset = ep && isPublicStory(ep) ? await db.get("audio_assets", ep.audio_asset_id!) : null;
  if (!asset) return new Response("Not found", { status: 404, headers: CORS });
  if (asset.kind === "sample") return new Response(null, { status: 307, headers: { ...CORS, Location: asset.url } });
  try {
    const res = await serveStoredAudio(req, asset.storage_key, asset.mime_type);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
    headers.set("cache-control", "public, max-age=3600");
    return new Response(res.body, { status: res.status, headers });
  } catch {
    return new Response("Audio file missing", { status: 404, headers: CORS });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
