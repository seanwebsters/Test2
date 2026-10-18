import Link from "next/link";
import { RarityGem } from "@/components/cards/RarityGem";
import { Avatar } from "@/components/ui/Avatar";
import { fmt } from "@/components/ui/Currency";
import { container, eyebrow } from "@/components/ui/styles";
import { isReleased, liveUniverses } from "@/lib/catalog";
import { universeStats } from "@/lib/services/discovery";
import { pageCtx } from "@/lib/view/page";

export const metadata = { title: "Charts" };

function Table({ title, note, rows }: { title: string; note?: string; rows: { key: string; href: string; label: React.ReactNode; sub?: string; value: string }[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-ink-2 p-5">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {note && <p className="text-[12px] text-bone-4">{note}</p>}
      <ol className="mt-4 space-y-1">
        {rows.map((r, i) => (
          <li key={r.key}>
            <Link href={r.href} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04]">
              <span className={`w-6 text-right font-brand text-sm ${i < 3 ? "text-ember-2" : "text-bone-4"}`}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.label}</span>
                {r.sub && <span className="block truncate text-[12px] text-bone-3">{r.sub}</span>}
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums">{r.value}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function ChartsPage() {
  const { state, at, idx } = await pageCtx();
  const live = liveUniverses(state, at);
  const stats = universeStats(state, at);
  const s = (id: string) => stats.get(id)!;
  const ownership = new Map<string, number>();
  for (const inv of Object.values(state.inventory)) for (const cid of Object.keys(inv)) ownership.set(cid, (ownership.get(cid) ?? 0) + 1);
  const topCards = [...ownership.entries()].map(([id, n]) => ({ c: idx.cards.get(id)!, n })).filter((x) => x.c && isReleased(idx, x.c.releaseOffsetDays, at)).sort((a, b) => b.n - a.n || b.c.number - a.c.number).slice(0, 10);
  const collectors = Object.values(state.users).filter((u) => !u.isGuest && u.role !== "admin").map((u) => ({ u, n: Object.keys(state.inventory[u.id] ?? {}).length })).sort((a, b) => b.n - a.n).slice(0, 10);
  const uname = (id: string) => idx.byId.get(id)!;
  return (
    <div className={`${container} pt-10`}>
      <p className={eyebrow}>Charts</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">What the multiverse is collecting.</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Table title="Trending universes" note="Growth × reach. Includes demo figures." rows={[...live].sort((a, b) => s(b.id).shown.growth * Math.log(s(b.id).shown.followers) - s(a.id).shown.growth * Math.log(s(a.id).shown.followers)).map((u) => ({ key: u.id, href: `/universes/${u.slug}`, label: u.title, sub: u.tagline, value: `+${Math.round(s(u.id).shown.growth * 100)}%` }))} />
        <Table title="Most followed" note="Includes demo figures." rows={[...live].sort((a, b) => s(b.id).shown.followers - s(a.id).shown.followers).map((u) => ({ key: u.id, href: `/universes/${u.slug}`, label: u.title, value: fmt(s(u.id).shown.followers) }))} />
        <Table title="Most collected" note="Collectors, includes demo figures." rows={[...live].sort((a, b) => s(b.id).shown.collectors - s(a.id).shown.collectors).map((u) => ({ key: u.id, href: `/universes/${u.slug}`, label: u.title, value: fmt(s(u.id).shown.collectors) }))} />
        <Table title="Hot this week" note="Packs opened on this server in the last 7 days (live data)." rows={[...live].sort((a, b) => s(b.id).live.packs7d - s(a.id).live.packs7d).map((u) => ({ key: u.id, href: `/universes/${u.slug}`, label: u.title, value: String(s(u.id).live.packs7d) }))} />
        <Table
          title="Most owned cards"
          note="Live data from this server."
          rows={topCards.map(({ c, n }) => ({ key: c.id, href: `/cards/${c.id}`, label: <span className="flex items-center gap-2"><RarityGem rarity={c.rarity} />{c.name}</span>, sub: uname(c.universeId).title, value: `${n}` }))}
        />
        <Table title="Top collectors" note="Unique cards owned (live data)." rows={collectors.map(({ u, n }) => ({ key: u.id, href: `/profile/${u.username}`, label: <span className="flex items-center gap-2"><Avatar seed={u.avatarSeed} name={u.displayName} size={22} />{u.displayName}</span>, sub: `@${u.username}${u.isDemo ? " · demo collector" : ""}`, value: String(n) }))} />
      </div>
    </div>
  );
}
