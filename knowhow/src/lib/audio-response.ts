import "server-only";

/** Serves an MP3 buffer with HTTP Range support so HTML5 audio can seek. */
export function audioResponse(req: Request, data: Buffer, cache = "private, max-age=3600"): Response {
  const size = data.length;
  const range = req.headers.get("range");
  const base = { "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes", "Cache-Control": cache };
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      let start = m[1] ? Number(m[1]) : NaN;
      let end = m[2] ? Number(m[2]) : size - 1;
      if (Number.isNaN(start)) {
        start = Math.max(0, size - end);
        end = size - 1;
      }
      if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      end = Math.min(end, size - 1);
      return new Response(new Uint8Array(data.subarray(start, end + 1)), {
        status: 206,
        headers: { ...base, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
      });
    }
  }
  return new Response(new Uint8Array(data), { headers: { ...base, "Content-Length": String(size) } });
}
