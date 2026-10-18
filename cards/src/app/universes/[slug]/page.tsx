import Link from "next/link";
import { CardThumb } from "@/components/cards/CardThumb";
import { RarityGem } from "@/components/cards/RarityGem";
import { Avatar } from "@/components/ui/Avatar";
import { Countdown } from "@/components/ui/Countdown";
import { fmt } from "@/components/ui/Currency";
import { btn, container, eyebrow } from "@/components/ui/styles";
import { RelationshipGraph } from "@/components/universe/RelationshipGraph";
import { Teaser } from "@/components/universe/Teaser";
import { WorldMap } from "@/components/universe/WorldMap";
import { isReleased, releasedCards, releaseTime } from "@/lib/catalog";
import { DAY_MS } from "@/lib/clock";
import { RARITY_META, rarityRank } from "@/lib/economy/config";
import { universeStats } from "@/lib/services/discovery";
import { episodeAccess } from "@/lib/services/story";
import { faceFor } from "@/lib/view/face";
import { liveUniverseOr404 } from "@/lib/view/load";
import { pageCtx } from "@/lib/view/page";
import { universeView } from "@/lib/view/universe";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: slug.split("-").map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ") };
}

const ago = (ms: number) => (ms < 3600_000 ? `${Math.max(1, Math.round(ms / 60_000))}m ago` : ms < DAY_MS ? `${Math.round(ms / 3600_000)}h ago` : `${Math.round(ms / DAY_MS)}d ago`);

export default async function UniverseOverview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { state, user, at, idx } = await pageCtx();
  const u = liveUniverseOr404(state, slug, at, user.role === "admin");
  const v = universeView(state, u, user.id, at);
  const inv = state.inventory[user.id] ?? {};
  const released = releasedCards(idx, u, at);
  const stats = universeStats(state, at).get(u.id)!;
  const leads = u.characters.filter((c) => c.role !== "mystery");
  const charCards = leads.map((c) => ({ c, card: released.find((k) => k.characterId === c.id) })).filter((x) => x.card);
  const upcomingEps = u.episodes.filter((e) => !isReleased(idx, e.releaseOffsetDays, at));
  const upcomingCards = u.cards.filter((c) => !isReleased(idx, c.releaseOffsetDays, at)).sort((a, b) => a.releaseOffsetDays - b.releaseOffsetDays);
  const activity = state.openings
    .filter((o) => o.universeId === u.id)
    .slice(-60)
    .reverse()
    .flatMap((o) => o.items.filter((i) => rarityRank(i.rarity) >= rarityRank("rare")).slice(0, 1).map((i) => ({ o, i })))
    .slice(0, 8);
  const recentFollows = state.follows.filter((f) => f.universeId === u.id).slice(-4).reverse();
  const beats = [u.world.history.split(". ")[0] + ".", u.world.conflicts[0]!, u.world.secrets[0] ? "And nothing is what it seems." : u.tagline];

  return (
    <div className={`${container} py-10`}>
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Teaser universeId={u.id} title={u.title} font={u.style.displayFont} palette={u.style.palette} style={u.style.artStyle} seed={v.seed + 5} beats={beats} />
        </div>
        <div>
          <p className={eyebrow}>The story so far</p>
          <p className="mt-3 text-lg leading-relaxed text-bone">{u.synopsis}</p>
          <p className="mt-4 leading-relaxed text-bone-2">{u.premise}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link href={`/packs/standard?u=${u.slug}`} className="rounded-2xl border border-white/10 bg-ink-2 p-4 hover:border-white/25">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bone-3">Standard pack</p>
              <p className="mt-1 font-bold">5 cards · 100 Shards</p>
            </Link>
            <Link href={`/packs/premium?u=${u.slug}`} className="rounded-2xl border border-white/10 bg-ink-2 p-4 hover:border-white/25">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bone-3">Premium pack</p>
              <p className="mt-1 font-bold">8 cards · Rare+ guaranteed</p>
            </Link>
            <Link href={`/packs/daily?u=${u.slug}`} className="rounded-2xl border border-white/10 bg-ink-2 p-4 hover:border-white/25">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bone-3">Daily drop</p>
              <p className="mt-1 font-bold">Free, every day</p>
            </Link>
            <Link href={`/universes/${u.slug}/stories`} className="rounded-2xl border border-white/10 bg-ink-2 p-4 hover:border-white/25">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bone-3">Episode packs</p>
              <p className="mt-1 font-bold">Free when you finish a chapter</p>
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-16">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight">Featured characters</h2>
          <Link href={`/universes/${u.slug}/characters`} className="text-sm font-semibold text-bone-3 hover:text-bone">Meet the cast</Link>
        </div>
        <div className="no-scrollbar -mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-2">
          {charCards.map(({ c, card }) => (
            <CardThumb key={c.id} face={faceFor(card!, u)} locked={!inv[card!.id]} count={inv[card!.id]?.count} href={`/universes/${u.slug}/characters#${c.id}`} caption={<><b className="text-bone">{c.name}</b><br />{c.title}</>} />
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Factions</h2>
          <div className="mt-5 space-y-3">
            {u.factions.map((f) => {
              const fc = released.filter((c) => c.factionId === f.id);
              const own = fc.filter((c) => inv[c.id]).length;
              return (
                <div key={f.id} className="rounded-2xl border border-white/10 bg-ink-2 p-5" style={{ borderLeft: `4px solid ${f.color}` }}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-bold">{f.name}</h3>
                    <span className="text-[12px] font-semibold text-bone-3">{own}/{fc.length} cards</span>
                  </div>
                  <p className="mt-0.5 text-[13px] italic" style={{ color: f.color }}>“{f.motto}”</p>
                  <p className="mt-2 text-sm text-bone-2">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Relationships</h2>
          <div className="mt-5 rounded-2xl border border-white/10 bg-ink-2 p-4">
            <RelationshipGraph characters={u.characters} palette={u.style.palette} />
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-extrabold tracking-tight">The world</h2>
            <Link href={`/universes/${u.slug}/lore`} className="text-sm font-semibold text-bone-3 hover:text-bone">Read the lore</Link>
          </div>
          <div className="mt-5"><WorldMap locations={u.world.locations} palette={u.style.palette} seed={v.seed} /></div>
          <p className="mt-4 text-sm leading-relaxed text-bone-2">{u.world.geography}</p>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Story timeline</h2>
          <ol className="mt-5 space-y-1 border-l border-white/10 pl-5">
            {u.seasons.map((s) => (
              <li key={s.number} className="relative pb-4">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full" style={{ background: isReleased(idx, s.releaseOffsetDays, at) ? u.style.palette.accent : "#2e2e38" }} />
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bone-3">Season {s.number}{isReleased(idx, s.releaseOffsetDays, at) ? "" : " · Coming"}</p>
                <p className="font-bold">{s.title}</p>
                <p className="text-sm text-bone-3">{s.synopsis}</p>
                <ul className="mt-2 space-y-1">
                  {u.episodes.filter((e) => e.season === s.number).map((e) => {
                    const a = episodeAccess(state, user.id, e, at);
                    return (
                      <li key={e.id}>
                        <Link href={`/stories/${e.id}`} className="flex items-center gap-2 text-sm hover:text-bone">
                          <span className="w-8 shrink-0 text-bone-4">E{e.number}</span>
                          <span className={a.released ? "text-bone-2" : "text-bone-4"}>{e.title}</span>
                          {a.completed && <span className="text-[10px] font-bold text-uncommon">READ</span>}
                          {!a.released && <span className="ml-auto text-[11px] text-bone-4"><Countdown to={a.releaseAt} compact /></span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-16 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Upcoming releases</h2>
          <div className="mt-5 space-y-3">
            {upcomingEps.map((e) => (
              <Link key={e.id} href={`/stories/${e.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-ink-2 p-4 hover:border-white/25">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bone-3">S{e.season} E{e.number} · {e.cardIds.length} new cards</p>
                  <p className="truncate font-bold">{e.title}</p>
                </div>
                <Countdown to={releaseTime(idx, e.releaseOffsetDays)} compact />
              </Link>
            ))}
            {upcomingCards.filter((c) => c.season > 1).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 rounded-2xl border border-dashed border-white/15 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: RARITY_META[c.rarity].color }}><RarityGem rarity={c.rarity} size={11} /> Season {c.season} card announced</p>
                  <p className="truncate font-bold">{c.name}</p>
                  <p className="truncate text-[13px] text-bone-3">{c.description}</p>
                </div>
                <Countdown to={releaseTime(idx, c.releaseOffsetDays)} compact />
              </div>
            ))}
            {!upcomingEps.length && !upcomingCards.length && <p className="text-sm text-bone-3">Nothing scheduled yet. Follow to hear first.</p>}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Community</h2>
          <p className="mt-1 text-[12px] text-bone-4">{fmt(stats.shown.collectors)} collectors · {fmt(stats.shown.packsOpened)} packs opened (includes demo figures) · {stats.live.packs7d} packs opened this week on this server</p>
          <ul className="mt-5 space-y-2">
            {activity.map(({ o, i }) => {
              const who = state.users[o.userId];
              const card = idx.cards.get(i.cardId)!;
              return (
                <li key={o.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                  <Avatar seed={who?.avatarSeed ?? 0} name={who?.displayName ?? "Guest"} size={28} />
                  <span className="min-w-0 flex-1 truncate">
                    {who && !who.isGuest ? <Link className="font-semibold hover:underline" href={`/profile/${who.username}`}>@{who.username}</Link> : <span className="font-semibold">A guest</span>} pulled{" "}
                    <Link href={`/cards/${card.id}`} className="font-semibold hover:underline" style={{ color: RARITY_META[i.rarity].color }}>{card.name}</Link>
                  </span>
                  <span className="shrink-0 text-[11px] text-bone-4">{ago(at - Date.parse(o.createdAt))}</span>
                </li>
              );
            })}
            {recentFollows.map((f) => {
              const who = state.users[f.userId];
              return who && !who.isGuest ? (
                <li key={f.userId + f.at} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                  <Avatar seed={who.avatarSeed} name={who.displayName} size={28} />
                  <span className="flex-1"><Link className="font-semibold hover:underline" href={`/profile/${who.username}`}>@{who.username}</Link> started following</span>
                  <span className="text-[11px] text-bone-4">{ago(at - Date.parse(f.at))}</span>
                </li>
              ) : null;
            })}
          </ul>
          <Link href={`/universes/${u.slug}/cards`} className={`${btn("glass")} mt-6`}>Browse all {released.length} cards</Link>
        </div>
      </section>
    </div>
  );
}
