import { repo } from "@/lib/store";
import { compileGame, GAME_CSP } from "@/lib/engine/compile";

/**
 * Serves a compiled game for the sandboxed preview iframe. The CSP header
 * repeats the document's own policy, and `sandbox` here makes the document
 * an opaque origin even if it's opened directly in a tab.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const store = await repo();
  const version = await store.getVersion(id, Number(n));
  if (!version?.build) return new Response("Not found", { status: 404 });
  const emblem = (await store.listAssets()).find((a) => a.id === version.assetIds[0]);
  const html = compileGame(version.build, { emblemSvg: emblem?.kind === "svg" ? emblem.data : undefined });
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": `${GAME_CSP}; sandbox allow-scripts; frame-ancestors 'self'`,
      "Cache-Control": "no-store",
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
