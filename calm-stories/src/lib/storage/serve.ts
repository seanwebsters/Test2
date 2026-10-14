import "server-only";
import { notFound } from "@/lib/errors";
import { getStorage } from "./index";

/** Streams a stored object with HTTP Range support (needed for seeking). */
export async function serveStoredAudio(req: Request, key: string, mime: string): Promise<Response> {
  const storage = getStorage();
  const rangeHeader = req.headers.get("range");
  const m = rangeHeader ? /bytes=(\d+)-(\d*)/.exec(rangeHeader) : null;
  if (m) {
    const start = Number(m[1]);
    const end = m[2] ? Number(m[2]) : undefined;
    const obj = await storage.get(key, { start, end });
    if (!obj) throw notFound("Audio file missing.");
    const last = start + obj.data.length - 1;
    return new Response(new Uint8Array(obj.data), {
      status: 206,
      headers: {
        "content-type": mime,
        "content-length": String(obj.data.length),
        "content-range": `bytes ${start}-${last}/${obj.size}`,
        "accept-ranges": "bytes",
        "cache-control": "private, max-age=3600",
      },
    });
  }
  const obj = await storage.get(key);
  if (!obj) throw notFound("Audio file missing.");
  return new Response(new Uint8Array(obj.data), {
    headers: { "content-type": mime, "content-length": String(obj.size), "accept-ranges": "bytes", "cache-control": "private, max-age=3600" },
  });
}
