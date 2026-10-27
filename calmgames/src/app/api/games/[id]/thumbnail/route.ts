import { route, HttpError } from "@/lib/http";
import { repo } from "@/lib/store";

/** Screenshot captured by the QA run of the latest tested build. */
export const GET = route(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const png = await (await repo()).getThumbnail((await params).id);
  if (!png) throw new HttpError(404, "No thumbnail yet");
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "no-cache" } });
});
