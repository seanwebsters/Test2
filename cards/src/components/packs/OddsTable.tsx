import { RARITIES, VARIANTS } from "@/lib/content/types";
import { RARITY_META, VARIANT_META, bpToPercent, type EconomyConfig } from "@/lib/economy/config";
import { RarityGem } from "@/components/cards/RarityGem";

/** Transparent odds, read from the live economy config. */
export function OddsTable({ config, compact }: { config: EconomyConfig; compact?: boolean }) {
  return (
    <div className={`grid gap-6 ${compact ? "" : "md:grid-cols-3"}`}>
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-bone-3">Standard slot</p>
        <ul className="space-y-1.5">
          {RARITIES.map((r) => (
            <li key={r} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><RarityGem rarity={r} />{RARITY_META[r].label}</span>
              <span className="tabular-nums text-bone-2">{bpToPercent(config.standardSlot[r])}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-bone-3">Guaranteed slot (Rare+)</p>
        <ul className="space-y-1.5">
          {RARITIES.filter((r) => config.rarePlusSlot[r] > 0).map((r) => (
            <li key={r} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><RarityGem rarity={r} />{RARITY_META[r].label}</span>
              <span className="tabular-nums text-bone-2">{bpToPercent(config.rarePlusSlot[r])}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-bone-3">Cosmetic variant (any card)</p>
        <ul className="space-y-1.5">
          {VARIANTS.map((v) => (
            <li key={v} className="flex items-center justify-between text-sm">
              <span>{VARIANT_META[v].label}</span>
              <span className="tabular-nums text-bone-2">{bpToPercent(config.variants[v])}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11.5px] text-bone-4">First Edition applies only within 30 days of a card's release; otherwise the card is Standard.</p>
      </div>
    </div>
  );
}
