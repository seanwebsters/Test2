import { route } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { getStorage } from "@/lib/storage";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

/** Public artwork only (key prefix `art/`). Audio is always served through entitlement-checked routes. */
export const GET = route<{ params: Promise<{ key: string[] }> }>(async (_req, { params }) => {
  const { key } = await params;
  const path = key.join("/");
  if (!path.startsWith("art/") || path.includes("..")) throw notFound();
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const type = TYPES[ext];
  if (!type) throw notFound();
  const obj = await getStorage().get(path);
  if (!obj) throw notFound();
  return new Response(new Uint8Array(obj.data), { headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable" } });
});
