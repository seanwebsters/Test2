import Link from "next/link";
import { Award, Grid3x3, Images, LayoutGrid, Star } from "lucide-react";
import { Art } from "@/components/art/Art";
import { CardThumb } from "@/components/cards/CardThumb";
import { FilterBar } from "@/components/cards/FilterBar";
import { Gallery } from "@/components/collection/Gallery";
import { ShowcaseEditor } from "@/components/collection/ShowcaseEditor";
import { btn, container, eyebrow } from "@/components/ui/styles";
import { isLive, isReleased } from "@/lib/catalog";
import { hashString } from "@/lib/content/build";
import { RARITIES, type ArtStyle, type Palette } from "@/lib/content/types";
import { RARITY_META } from "@/lib/economy/config";
import { ACHIEVEMENTS } from "@/lib/services/achievements";
import { bestVariant, collectionSummary, sortCards } from "@/lib/view/collection";
import { faceFor } from "@/lib/view/face";
import { pageCtx } from "@/lib/view/page";

export const metadata = { title: "My Collection" };

const VIEWS = [
  { id: "grid", label: "Grid", icon: LayoutGrid },
  { id: "binder", label: "Binders", icon: Grid3x3 },
  { id: "gallery", label: "Gallery", icon: Images },
  { id: "showcase", label: "Showcase", icon: Star },
];

export default async function CollectionPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const view = sp.view ?? "grid";
  const { state, user, at, idx } = await pageCtx();
  const inv = state.inventory[user.id] ?? {};
  const sum = collectionSummary(state, user.id, at);
  const favs = new Set(state.favourites.filter((f) => f.userId === user.id).map((f) => f.cardId));
  const visible = sortCards(
    [...idx.cards.values()].filter((c) => {
      const u = idx.byId.get(c.universeId)!;
      return isLive(idx, u, at) && isReleased(idx, c.releaseOffsetDays, at);
    }),
  );
  const filtered = visible
    .filter((c) => (sp.show === "missing" ? !inv[c.id] : sp.show === "all" ? true : sp.show === "duplicates" ? (inv[c.id]?.count ?? 0) > 1 : sp.show === "favourites" ? favs.has(c.id) : !!inv[c.id]))
    .filter((c) => !sp.rarity || c.rarity === sp.rarity)
    .filter((c) => !sp.universe || idx.byId.get(c.universeId)?.slug === sp.universe);
  const recent = Object.entries(inv).sort((a, b) => b[1].lastAt.localeCompare(a[1].lastAt)).slice(0, 12).map(([id]) => idx.cards.get(id)!).filter(Boolean);
  const mine = state.achievements.filter((a) => a.userId === user.id);
  const face = (id: string) => {
    const c = idx.cards.get(id)!;
    return faceFor(c, idx.byId.get(c.universeId)!);
  };
  const pct = sum.totalAvailable ? Math.round((sum.unique / sum.totalAvailable) * 100) : 0;

  return (
    <div className={`${container} pt-10`}>
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className={eyebrow}>My Collection</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Your museum of worlds.</h1>
        </div>
        <dl className="grid grid-cols-4 gap-2 text-center">
          {[
            ["Cards", sum.unique],
            ["Copies", sum.copies],
            ["Worlds", sum.universes.filter((u) => u.owned).length],
            ["Complete", `${pct}%`],
          ].map(([l, v]) => (
            <div key={l} className="rounded-2xl border border-white/10 bg-ink-2 px-4 py-3">
              <dd className="text-2xl font-extrabold tabular-nums">{v}</dd>
              <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-bone-3">{l}</dt>
            </div>
          ))}
        </dl>
      </header>

      <nav className="mt-8 flex gap-1.5" aria-label="View mode">
        {VIEWS.map((v) => (
          <Link key={v.id} href={`/collection?view=${v.id}`} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold ${view === v.id ? "bg-bone text-ink" : "text-bone-2 hover:bg-white/5"}`} aria-current={view === v.id ? "page" : undefined}>
            <v.icon size={15} /> {v.label}
          </Link>
        ))}
      </nav>

      {sum.unique === 0 && (
        <div className="mt-10 rounded-3xl border border-white/10 bg-ink-2 p-10 text-center">
          <p className="text-xl font-bold">Your collection is waiting.</p>
          <p className="mt-2 text-bone-3">Open your free starter pack to get your first five cards.</p>
          <Link href="/welcome" className={`${btn("primary")} mt-5`}>Start collecting</Link>
        </div>
      )}

      {view === "grid" && sum.unique > 0 && (
        <>
          <div className="mt-6">
            <FilterBar
              base="/collection"
              current={{ ...sp, view: undefined }}
              groups={[
                { key: "show", label: "Show", options: [{ value: "all", label: "Everything" }, { value: "missing", label: "Missing" }, { value: "duplicates", label: "Duplicates" }, { value: "favourites", label: "Favourites" }] },
                { key: "rarity", label: "Rarity", options: RARITIES.map((r) => ({ value: r, label: RARITY_META[r].label })) },
                { key: "universe", label: "World", options: sum.universes.filter((u) => u.owned).map((u) => ({ value: u.slug, label: u.title })) },
              ]}
            />
          </div>
          {recent.length > 0 && !sp.show && !sp.rarity && !sp.universe && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">Recently acquired</h2>
              <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2">
                {recent.map((c) => (
                  <CardThumb key={c.id} face={face(c.id)} variant={bestVariant(inv[c.id])} count={inv[c.id]?.count} className="w-[34vw] sm:w-[140px]" />
                ))}
              </div>
            </section>
          )}
          <p className="mt-8 text-sm text-bone-3">{filtered.length} cards</p>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filtered.map((c) => (
              <CardThumb key={c.id} face={face(c.id)} variant={bestVariant(inv[c.id])} locked={!inv[c.id]} count={inv[c.id]?.count} className="w-full" />
            ))}
          </div>
        </>
      )}

      {view === "binder" && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sum.universes.map((u) => (
            <Link key={u.id} href={`/collection/${u.slug}`} className="focus-ring group relative overflow-hidden rounded-3xl border border-white/10 p-5" style={{ background: u.palette.bg }}>
              <div className="absolute inset-0 opacity-40 transition group-hover:opacity-60"><Art style={u.style as ArtStyle} palette={u.palette as Palette} seed={hashString(u.id)} aspect="hero" sceneOnly className="h-full w-full" /></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/20" />
              <div className="relative">
                <p className={`ff-${u.font} text-3xl`} style={{ color: u.palette.ink }}>{u.title}</p>
                <p className="mt-1 text-sm text-white/70">{u.owned} of {u.total} cards{u.complete ? " · Complete ✦" : ""}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full" style={{ width: `${(u.owned / Math.max(1, u.total)) * 100}%`, background: u.palette.accent }} /></div>
                <span className="mt-4 inline-block text-[13px] font-bold">Open binder →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {view === "gallery" && sum.unique > 0 && (
        <Gallery items={visible.filter((c) => inv[c.id]).sort((a, b) => RARITY_META[b.rarity].order - RARITY_META[a.rarity].order).map((c) => ({ face: face(c.id), variant: bestVariant(inv[c.id]), count: inv[c.id]!.count }))} />
      )}

      {view === "showcase" && sum.unique > 0 && (
        <div className="mt-8">
          <ShowcaseEditor owned={visible.filter((c) => inv[c.id]).map((c) => ({ face: face(c.id), variant: bestVariant(inv[c.id]) }))} initial={user.showcase} />
          <p className="mt-6 text-sm text-bone-3">Your public showcase appears on <Link className="underline" href={`/profile/${user.username}`}>your profile</Link>{user.isGuest ? " once you create an account" : ""}.</p>
        </div>
      )}

      <section className="mt-16">
        <h2 className="flex items-center gap-2 text-xl font-extrabold"><Award size={20} /> Achievements</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ACHIEVEMENTS.map((a) => {
            const got = mine.find((m) => m.key === a.key);
            return (
              <div key={a.key} className={`rounded-2xl border p-4 ${got ? "border-legendary/40 bg-legendary/[0.07]" : "border-white/10 bg-ink-2 opacity-70"}`}>
                <p className="font-bold">{a.title}</p>
                <p className="mt-0.5 text-[13px] text-bone-3">{a.description}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-bone-4">{got ? `Earned ${new Date(got.at).toLocaleDateString("en-GB", { timeZone: "UTC" })}` : `+${a.reward} Shards`}</p>
              </div>
            );
          })}
          {mine.filter((m) => m.key.startsWith("complete:")).map((m) => {
            const u = idx.byId.get(m.key.split(":")[1]!);
            return (
              <div key={m.key} className="rounded-2xl border border-mythic/40 bg-mythic/[0.07] p-4">
                <p className="font-bold">{u?.title} — Set complete</p>
                <p className="mt-0.5 text-[13px] text-bone-3">Every Season 1 card collected.</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
