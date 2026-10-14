import { HttpError, route, serveBytes } from "@/lib/api";
import { ensureSoundscapeSample } from "@/lib/audio/samples";

/** Public soundscape previews (used by Storymaker's ambience picker). */
export const GET = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const { slug } = await params;
  if (!/^[a-z0-9-]+$/.test(slug)) throw new HttpError(400, "Invalid soundscape");
  const obj = await ensureSoundscapeSample(slug);
  if (!obj) throw new HttpError(404, "Unknown soundscape");
  return serveBytes(req, obj.bytes, obj.contentType, "public, max-age=86400");
}, { limit: 600, bucket: "sample" });
