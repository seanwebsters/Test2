import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Binder } from "@/components/collection/Binder";
import { CardThumb } from "@/components/cards/CardThumb";
import { btn, container } from "@/components/ui/styles";
import { isReleased } from "@/lib/catalog";
import { RARITIES } from "@/lib/content/types";
import { RARITY_META } from "@/lib/economy/config";
import { SET_COMPLETION_REWARD } from "@/lib/services/achievements";
import { bestVariant } from "@/lib/view/collection";
import { faceFor } from "@/lib/view/face";
import { liveUniverseOr404 } from "@/lib/view/load";
import { pageCtx } from "@/lib/view/page";

export const metadata = { title: "Binder" };

export default async function UniverseBinder({ params, searchParams }: { params: Promise<{ universe: string }>; searchParams: Promise<{ view?: string }> }) {
  const { universe } = await params;
  const sp = await searchParams;
  const { state, user, at, idx } = await pageCtx();
  const u = liveUniverseOr404(state, universe, at, user.role === "admin");
  const inv = state.inventory[user.id] ?? {};
  const cards = u.cards.filter((c) => isReleased(idx, c.releaseOffsetDays, at)).sort((a, b) => a.season - b.season || a.number - b.number);
  const owned = cards.filter((c) => inv[c.id]).length;
  const dupes = cards.reduce((s, c) => s + Math.max(0, (inv[c.id]?.count ?? 0) - 1), 0);
  const complete = state.achievements.some((a) => a.userId === user.id && a.key === `complete:${u.id}:s1`);
  const p = u.style.palette;
  return (
    <div className={`${container} pt-8`}>
      <Link href="/collection?view=binder" className="flex w-fit items-center gap-1.5 text-[13px] font-semibold text-bone-3 hover:text-bone"><ArrowLeft size={15} /> All binders</Link>
      <header className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className={`ff-${u.style.displayFont} text-5xl md:text-6xl`} style={{ color: p.ink }}>{u.title}</h1>
          <p className="mt-2 text-bone-2">{owned} of {cards.length} collected · {dupes} duplicates{complete ? " · Set complete ✦" : ` · Complete the set for +${SET_COMPLETION_REWARD} Shards`}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
            {RARITIES.map((r) => {
              const rc = cards.filter((c) => c.rarity === r);
              return rc.length ? <span key={r} style={{ color: RARITY_META[r].color }}>{RARITY_META[r].label} {rc.filter((c) => inv[c.id]).length}/{rc.length}</span> : null;
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/collection/${u.slug}`} className={btn(sp.view !== "grid" ? "light" : "glass", "sm")}>Binder</Link>
          <Link href={`/collection/${u.slug}?view=grid`} className={btn(sp.view === "grid" ? "light" : "glass", "sm")}>Grid</Link>
          <Link href={`/packs/standard?u=${u.slug}`} className={btn("primary", "sm")}>Open a pack</Link>
        </div>
      </header>
      <div className="mt-8">
        {sp.view === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {cards.map((c) => <CardThumb key={c.id} face={faceFor(c, u)} variant={bestVariant(inv[c.id])} locked={!inv[c.id]} count={inv[c.id]?.count} className="w-full" />)}
          </div>
        ) : (
          <Binder title={u.title} palette={p} slots={cards.map((c) => ({ face: faceFor(c, u), owned: !!inv[c.id], count: inv[c.id]?.count ?? 0, variant: bestVariant(inv[c.id]) }))} />
        )}
      </div>
      <p className="mt-10 text-center text-[13px] text-bone-3">Missing a card? Duplicates turn into Stardust — craft any missing card from its card page.</p>
    </div>
  );
}
