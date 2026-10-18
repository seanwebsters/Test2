import { createElement } from "react";
import { Art } from "@/components/art/Art";
import { catalog, isLive, isReleased } from "@/lib/catalog";
import { now } from "@/lib/clock";
import { getStore } from "@/lib/db";
import { RARITY_META } from "@/lib/economy/config";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Shareable card image (SVG, 750×1050). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = getStore().read();
  const idx = catalog(state);
  const card = idx.cards.get(id);
  const u = card && idx.byId.get(card.universeId);
  const at = now();
  if (!card || !u || !isLive(idx, u, at) || !isReleased(idx, card.releaseOffsetDays, at)) return new Response("Not found", { status: 404 });
  const { renderToStaticMarkup } = await import("react-dom/server");
  const art = renderToStaticMarkup(createElement(Art, { style: u.style.artStyle, palette: u.style.palette, seed: card.artSeed, kind: card.kind, aspect: "card" }))
    .replace("<svg ", '<svg x="40" y="40" width="670" height="640" ');
  const m = RARITY_META[card.rarity];
  const p = u.style.palette;
  const set = u.sets.find((s) => s.id === card.setId);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050" width="750" height="1050">
<defs><linearGradient id="fr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="${m.color}"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient>
<clipPath id="ac"><rect x="40" y="40" width="670" height="640" rx="22"/></clipPath></defs>
<rect width="750" height="1050" rx="34" fill="${p.bg}"/>
<g clip-path="url(#ac)">${art}</g>
<rect x="9" y="9" width="732" height="1032" rx="30" fill="none" stroke="url(#fr)" stroke-width="18"/>
<text x="48" y="760" font-family="Georgia, serif" font-size="54" fill="${p.ink}">${esc(card.name)}</text>
<text x="50" y="808" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="3" fill="${m.color}" font-weight="700">${m.label.toUpperCase()} · ${esc(card.kind.toUpperCase())}</text>
<foreignObject x="48" y="830" width="654" height="120"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Helvetica,Arial,sans-serif;font-size:24px;line-height:1.35;color:${p.ink};opacity:.85">${esc(card.description)}</div></foreignObject>
<text x="50" y="1000" font-family="Helvetica, Arial, sans-serif" font-size="18" letter-spacing="2" fill="${p.ink}" opacity=".6">${esc(set?.code ?? "")} ${String(card.number).padStart(3, "0")} · ${esc(u.title.toUpperCase())}</text>
<text x="700" y="1000" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="6" fill="${p.ink}">NEXARA</text>
</svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=3600" } });
}
