import "server-only";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { GameBuild } from "./schemas";

/**
 * Content Security Policy for every generated game. Inline code only, no
 * network of any kind, no forms, no navigation of the parent. Games are also
 * loaded in an iframe sandboxed without allow-same-origin, so they run in an
 * opaque origin with no access to studio cookies, storage or credentials.
 */
export const GAME_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "media-src data: blob:",
  "connect-src 'none'",
  "worker-src blob:",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

const cache = new Map<string, string>();
function readAsset(rel: string): string {
  const hit = cache.get(rel);
  if (hit !== undefined && process.env.NODE_ENV === "production") return hit;
  const file = path.join(/*turbopackIgnore: true*/ process.cwd(), rel);
  if (!existsSync(file)) throw new Error(`Missing ${rel}. Run "npm run runtime" to build the game runtime.`);
  const text = readFileSync(file, "utf8");
  cache.set(rel, text);
  return text;
}

const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const inlineScript = (js: string) => js.replace(/<\/script/gi, "<\\/script");

/** Turn a build into one self-contained HTML document. */
export function compileGame(build: GameBuild, opts: { emblemSvg?: string } = {}): string {
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta http-equiv="Content-Security-Policy" content="${GAME_CSP}">`;
  if (build.mode === "template") {
    const emblem = opts.emblemSvg ? `data:image/svg+xml;base64,${Buffer.from(opts.emblemSvg).toString("base64")}` : "";
    return `<!doctype html><html lang="en"><head>${head}<title>${escapeHtml(build.config.title)}</title></head><body>
<script type="application/json" id="calm-config">${safeJson(build.config)}</script>
<script type="text/plain" id="calm-emblem">${emblem}</script>
<script>${inlineScript(readAsset(".runtime/calm-runtime.js"))}</script>
</body></html>`;
  }
  const phaser = build.engine === "phaser" ? `<script>${inlineScript(readAsset("node_modules/phaser/dist/phaser.min.js"))}</script>` : "";
  const bridge = `<script>${inlineScript(readAsset(".runtime/freeform-bridge.js"))}</script>`;
  // Freeform documents are written by the model; we keep only their body and
  // styles and wrap them in our own head so the CSP and bridge always apply.
  const body = build.html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? build.html.replace(/<\/?(html|head|body)[^>]*>/gi, "");
  const styles = (build.html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? []).join("\n");
  return `<!doctype html><html lang="en"><head>${head}<title>${escapeHtml(build.title)}</title>${styles}${bridge}${phaser}</head><body>${body.replace(/<meta[^>]*>/gi, "")}</body></html>`;
}
