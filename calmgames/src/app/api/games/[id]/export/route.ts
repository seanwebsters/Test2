import { route, HttpError } from "@/lib/http";
import { repo } from "@/lib/store";
import { exportBundle, slug } from "@/lib/exporter";

export const GET = route(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const store = await repo();
  const id = (await params).id;
  const game = await store.getGame(id);
  if (!game) throw new HttpError(404, "Game not found");
  const n = Number(new URL(req.url).searchParams.get("version") ?? game.currentVersion);
  const version = await store.getVersion(id, n);
  if (!version?.build) throw new HttpError(400, "This version has no playable build to export.");
  const zip = await exportBundle(game, version, await store.listAssets());
  return new Response(new Uint8Array(zip), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${slug(game.name)}-v${n}.zip"` },
  });
});
