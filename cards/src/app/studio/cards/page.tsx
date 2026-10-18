import Link from "next/link";
import { RarityGem } from "@/components/cards/RarityGem";
import { FilterBar } from "@/components/cards/FilterBar";
import { SelectPatch } from "@/components/studio/Forms";
import { catalog } from "@/lib/catalog";
import { RARITIES } from "@/lib/content/types";
import { getStore } from "@/lib/db";
import { RARITY_META } from "@/lib/economy/config";

export const metadata = { title: "Card Sets" };

export default async function StudioCards({ searchParams }: { searchParams: Promise<{ universe?: string; rarity?: string }> }) {
  const sp = await searchParams;
  const state = getStore().read();
  const idx = catalog(state);
  const owned = new Map<string, number>();
  for (const inv of Object.values(state.inventory)) for (const [id, o] of Object.entries(inv)) owned.set(id, (owned.get(id) ?? 0) + o.count);
  const cards = [...idx.cards.values()].filter((c) => (!sp.universe || c.universeId === sp.universe) && (!sp.rarity || c.rarity === sp.rarity));
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">Card sets</h1>
      <p className="mt-1 text-sm text-bone-3">{idx.cards.size} cards across {idx.universes.length} universes. Rarity changes apply to future packs only; they're audited.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {RARITIES.map((r) => <div key={r} className="rounded-xl border border-white/10 bg-ink-2 p-3 text-sm"><span className="flex items-center gap-1.5" style={{ color: RARITY_META[r].color }}><RarityGem rarity={r} /> {RARITY_META[r].label}</span><b className="text-2xl tabular-nums">{[...idx.cards.values()].filter((c) => c.rarity === r).length}</b></div>)}
      </div>
      <div className="mt-6">
        <FilterBar base="/studio/cards" current={sp} groups={[{ key: "universe", label: "World", options: idx.universes.map((u) => ({ value: u.id, label: u.title })) }, { key: "rarity", label: "Rarity", options: RARITIES.map((r) => ({ value: r, label: RARITY_META[r].label })) }]} />
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-bone-4"><tr><th className="p-2.5">Card</th><th>Universe</th><th>Kind</th><th>Rarity</th><th className="text-right">Copies owned</th><th className="p-2.5 text-right">Id</th></tr></thead>
          <tbody>
            {cards.slice(0, 400).map((c) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="p-2.5"><Link className="font-semibold hover:underline" href={`/cards/${c.id}`}>{c.name}</Link></td>
                <td className="text-bone-3">{idx.byId.get(c.universeId)?.title}</td>
                <td className="text-bone-3">{c.kind}</td>
                <td><SelectPatch url="/api/studio/card/patch" body={{ cardId: c.id }} name="rarity" value={c.rarity} options={[...RARITIES]} /></td>
                <td className="text-right tabular-nums">{owned.get(c.id) ?? 0}</td>
                <td className="p-2.5 text-right font-mono text-[11px] text-bone-4">{c.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
