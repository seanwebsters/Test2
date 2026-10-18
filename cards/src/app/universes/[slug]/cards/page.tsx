import { CardThumb } from "@/components/cards/CardThumb";
import { FilterBar } from "@/components/cards/FilterBar";
import { container } from "@/components/ui/styles";
import { isReleased } from "@/lib/catalog";
import { CARD_KINDS, RARITIES } from "@/lib/content/types";
import { RARITY_META } from "@/lib/economy/config";
import { faceFor } from "@/lib/view/face";
import { liveUniverseOr404 } from "@/lib/view/load";
import { pageCtx } from "@/lib/view/page";

export const metadata = { title: "Cards" };

export default async function UniverseCards({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { state, user, at, idx } = await pageCtx();
  const u = liveUniverseOr404(state, slug, at, user.role === "admin");
  const inv = state.inventory[user.id] ?? {};
  const cards = u.cards
    .filter((c) => isReleased(idx, c.releaseOffsetDays, at))
    .filter((c) => !sp.rarity || c.rarity === sp.rarity)
    .filter((c) => !sp.faction || c.factionId === sp.faction)
    .filter((c) => !sp.kind || c.kind === sp.kind)
    .filter((c) => !sp.show || (sp.show === "owned" ? inv[c.id] : !inv[c.id]));
  const kinds = CARD_KINDS.filter((k) => u.cards.some((c) => c.kind === k));
  return (
    <div className={`${container} py-8`}>
      <FilterBar
        base={`/universes/${u.slug}/cards`}
        current={sp}
        groups={[
          { key: "show", label: "Show", options: [{ value: "owned", label: "Owned" }, { value: "missing", label: "Missing" }] },
          { key: "rarity", label: "Rarity", options: RARITIES.map((r) => ({ value: r, label: RARITY_META[r].label })) },
          { key: "faction", label: "Faction", options: u.factions.map((f) => ({ value: f.id, label: f.name })) },
          { key: "kind", label: "Type", options: kinds.map((k) => ({ value: k, label: k[0]!.toUpperCase() + k.slice(1) })) },
        ]}
      />
      <p className="mt-6 text-sm text-bone-3">{cards.length} cards · locked cards show as silhouettes until you discover them</p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {cards.map((c) => (
          <CardThumb key={c.id} face={faceFor(c, u)} locked={!inv[c.id]} count={inv[c.id]?.count} className="w-full" />
        ))}
      </div>
      {cards.length === 0 && <p className="mt-10 text-center text-bone-3">No cards match these filters.</p>}
    </div>
  );
}
