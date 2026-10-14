/** Applies the selected demo-content mode once, before any screen renders. */
import { worlds } from "./worlds";
import { characters } from "./characters";
import { partners } from "./partners";
import { curatedDreams } from "./catalog";
import { applyConceptSkin, CONCEPT_DREAMS, getContentMode } from "./concept";

export const contentMode = getContentMode();

if (contentMode === "concept") {
  // worlds that were Calm Originals stand in for third-party or public-domain stories
  const base = partners.find((p) => p.id === "calm-studios")!;
  partners.push(
    { ...base, id: "wb-polar", name: "Warner Bros.", tier: "studio", credit: "The Polar Express · Warner Bros. (concept, not licensed)" },
    { ...base, id: "public-domain", name: "Public domain", tier: "publisher", credit: "The Secret Garden · Frances Hodgson Burnett (public domain)" },
  );
  worlds.find((w) => w.id === "aurora-line")!.partnerId = "wb-polar";
  worlds.find((w) => w.id === "glasshouse-gardens")!.partnerId = "public-domain";
  applyConceptSkin(worlds, characters, partners);
  for (const p of partners) if (p.id !== "calm-studios" && p.id !== "public-domain") p.contractRef = "concept";
  for (const d of curatedDreams) {
    const o = CONCEPT_DREAMS[d.id];
    if (o) Object.assign(d, o);
    if (d.author.kind === "calm" && (d.request.worlds.includes("aurora-line") || d.request.worlds.includes("glasshouse-gardens"))) d.author = { ...d.author };
  }
  const ship = curatedDreams.find((d) => d.id === "orig-midnight-ship");
  if (ship) ship.request.user_prompt = "A peaceful night aboard the Black Pearl where Luke Skywalker unexpectedly appears and everyone has to work together.";
}
