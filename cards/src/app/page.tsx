import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { CardThumb } from "@/components/cards/CardThumb";
import { Hero } from "@/components/feed/Hero";
import { Row } from "@/components/feed/Row";
import { Art } from "@/components/art/Art";
import { Countdown } from "@/components/ui/Countdown";
import { btn, container, eyebrow } from "@/components/ui/styles";
import { UniverseBanner, UniverseTile } from "@/components/universe/UniverseTile";
import { isReleased, liveUniverses, releaseTime } from "@/lib/catalog";
import { DAY_MS } from "@/lib/clock";
import { rarityRank } from "@/lib/economy/config";
import { becauseYouCollected, recommend, universeStats } from "@/lib/services/discovery";
import { dailyStatus } from "@/lib/services/daily";
import { faceFor } from "@/lib/view/face";
import { pageCtx } from "@/lib/view/page";
import { universeView } from "@/lib/view/universe";

export default async function Home({ searchParams }: { searchParams: Promise<{ skip?: string }> }) {
  const { state, user, at, idx } = await pageCtx();
  const sp = await searchParams;
  if (!user.onboardedAt && !user.starterClaimed && !sp.skip && user.role !== "admin") redirect("/welcome");

  const live = liveUniverses(state, at);
  const views = new Map(live.map((u) => [u.id, universeView(state, u, user.id, at)]));
  const V = (id: string) => views.get(id)!;
  const stats = universeStats(state, at);

  const hero =
    live.filter((u) => u.editorial.featured).sort((a, b) => b.launchOffsetDays - a.launchOffsetDays)[0] ?? live[0]!;
  const trending = [...live].sort((a, b) => stats.get(b.id)!.shown.growth * Math.log(stats.get(b.id)!.shown.followers) - stats.get(a.id)!.shown.growth * Math.log(stats.get(a.id)!.shown.followers)).slice(0, 10);
  const inv = state.inventory[user.id] ?? {};
  const lastTouch = new Map<string, string>();
  for (const [cid, o] of Object.entries(inv)) {
    const uid = idx.cards.get(cid)?.universeId;
    if (uid && (lastTouch.get(uid) ?? "") < o.lastAt) lastTouch.set(uid, o.lastAt);
  }
  const continuing = live.filter((u) => lastTouch.has(u.id)).sort((a, b) => lastTouch.get(b.id)!.localeCompare(lastTouch.get(a.id)!));
  const weekAgo = at - 7 * DAY_MS;
  const newThisWeek = live
    .flatMap((u) => u.episodes.filter((e) => isReleased(idx, e.releaseOffsetDays, at) && releaseTime(idx, e.releaseOffsetDays) >= weekAgo).map((e) => ({ u, e })))
    .sort((a, b) => b.e.releaseOffsetDays - a.e.releaseOffsetDays);
  const mostCollected = [...live].sort((a, b) => stats.get(b.id)!.shown.collectors - stats.get(a.id)!.shown.collectors);
  const gems = live.filter((u) => u.editorial.hiddenGem || stats.get(u.id)!.shown.followers < 100_000).slice(0, 8);
  const seasons = live.filter((u) => V(u.id).newSeasonSoon).sort((a, b) => V(a.id).newSeasonSoon!.at - V(b.id).newSeasonSoon!.at);
  const almost = continuing.filter((u) => V(u.id).owned / Math.max(1, V(u.id).cards) >= 0.3).sort((a, b) => V(b.id).owned / V(b.id).cards - V(a.id).owned / V(a.id).cards);
  const dayAgo = at - DAY_MS;
  const rarePulls = state.openings
    .filter((o) => Date.parse(o.createdAt) >= dayAgo)
    .flatMap((o) => o.items.filter((i) => rarityRank(i.rarity) >= rarityRank("epic")).map((i) => ({ i, o })))
    .sort((a, b) => rarityRank(b.i.rarity) - rarityRank(a.i.rarity) || b.o.createdAt.localeCompare(a.o.createdAt))
    .slice(0, 14);
  const recs = recommend({ state, userId: user.id, at }).slice(0, 10);
  const because = becauseYouCollected(state, user.id, at);
  const daily = dailyStatus(state, user.id, at);
  const featured = daily.featured ? V(daily.featured.id) : undefined;

  return (
    <>
      <Hero u={V(hero.id)} starterAvailable={!user.starterClaimed} />

      <Row title="Trending universes" subtitle="The fastest-rising worlds on NEXARA this week" href="/charts" id="trending">
        {trending.map((u, i) => (
          <UniverseTile key={u.id} u={V(u.id)} rank={i + 1} />
        ))}
      </Row>

      {continuing.length > 0 ? (
        <Row title="Continue collecting" subtitle="Pick up where you left off" href="/collection" id="continue">
          {continuing.map((u) => (
            <UniverseTile key={u.id} u={V(u.id)} note={`${V(u.id).owned} of ${V(u.id).cards} collected`} />
          ))}
        </Row>
      ) : (
        <section className={`${container} mt-12`}>
          <div className="glass flex flex-col items-start gap-4 rounded-3xl p-6 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className={eyebrow}>Start your collection</p>
              <p className="mt-1 text-lg font-bold">Your first five cards are free. Pick any universe.</p>
            </div>
            <Link href="/welcome" className={btn("primary")}>Choose a universe</Link>
          </div>
        </section>
      )}

      <Row title="New this week" subtitle="Fresh episodes — and the cards they introduce" href="/stories" id="new">
        {newThisWeek.length
          ? newThisWeek.map(({ u, e }) => <UniverseBanner key={e.id} u={V(u.id)} eyebrow={`New · S${e.season} E${e.number}`} cta={e.title} />)
          : live.slice(0, 4).map((u) => <UniverseBanner key={u.id} u={V(u.id)} eyebrow="Latest" />)}
      </Row>

      <section className={`${container} mt-12`} aria-labelledby="daily">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10" style={{ background: featured?.palette.bg }}>
          {featured && (
            <div className="nx-animate absolute inset-0 opacity-70">
              <Art style={featured.style} palette={featured.palette} seed={featured.seed + 3} aspect="hero" sceneOnly className="h-full w-full" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/20" />
          <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:p-10">
            <div className="flex-1">
              <p className={eyebrow}>Your daily drops</p>
              <h2 id="daily" className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
                {daily.claimed ? "Today's pack is opened." : "Today's free pack is ready."}
              </h2>
              <p className="mt-2 max-w-lg text-bone-2">
                {daily.claimed ? "A new drop arrives at 00:00 UTC." : `Five cards, free. Today's featured world: ${featured?.title ?? "any universe"}.`} Day {Math.min(7, daily.nextTrackIndex + (daily.claimed ? 0 : 1)) || 7} of your 7-day track.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              {daily.claimed ? <Countdown to={daily.nextResetAt} /> : null}
              <Link href="/daily" className={btn(daily.claimed ? "glass" : "primary", "lg")}>
                <Gift size={18} /> {daily.claimed ? "See challenges" : "Claim daily pack"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Row title="Most collected" subtitle="Where collectors are spending their packs" id="most">
        {mostCollected.map((u) => (
          <UniverseTile key={u.id} u={V(u.id)} />
        ))}
      </Row>

      {rarePulls.length > 0 && (
        <Row title="Rare cards discovered today" subtitle="Epic, Legendary and Mythic pulls from collectors in the last 24 hours" id="rare">
          {rarePulls.map(({ i, o }) => {
            const card = idx.cards.get(i.cardId)!;
            const u = idx.byId.get(card.universeId)!;
            const who = state.users[o.userId];
            return (
              <CardThumb
                key={`${o.id}${i.slot}`}
                face={faceFor(card, u)}
                variant={i.variant}
                className="w-[40vw] sm:w-[170px]"
                caption={
                  who && !who.isGuest ? (
                    <Link href={`/profile/${who.username}`} className="hover:text-bone">@{who.username}</Link>
                  ) : (
                    "A guest collector"
                  )
                }
              />
            );
          })}
        </Row>
      )}

      <Row title="Hidden gems" subtitle="Small, strange and deeply loved" id="gems">
        {gems.map((u) => (
          <UniverseTile key={u.id} u={V(u.id)} />
        ))}
      </Row>

      {seasons.length > 0 && (
        <Row title="New seasons" subtitle="Countdowns to the next chapter" id="seasons">
          {seasons.map((u) => (
            <UniverseBanner key={u.id} u={V(u.id)} eyebrow={`Season ${V(u.id).newSeasonSoon!.number} · ${new Date(V(u.id).newSeasonSoon!.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`} cta={V(u.id).newSeasonSoon!.title} />
          ))}
        </Row>
      )}

      {almost.length > 0 && (
        <Row title="Almost complete" subtitle="So close you can taste the set bonus" href="/collection" id="almost">
          {almost.map((u) => (
            <UniverseTile key={u.id} u={V(u.id)} note={`${V(u.id).cards - V(u.id).owned} cards to go · +500 Shards on completion`} />
          ))}
        </Row>
      )}

      {because && because.similar.length > 0 && (
        <Row title={`Because you collected ${because.card.name}`} subtitle={`More worlds with the spirit of ${because.source.title}`} id="because">
          {because.similar.slice(0, 8).map((u) => (
            <UniverseTile key={u.id} u={V(u.id)} />
          ))}
        </Row>
      )}

      <Row title="Recommended for you" subtitle="Based on your genres, collection and reading" href="/discover" id="recs">
        {recs.map((r) => (
          <UniverseTile key={r.universe.id} u={V(r.universe.id)} note={r.reasons[0]} />
        ))}
      </Row>

      <p className={`${container} mt-14 text-[11.5px] text-bone-4`}>
        Follower, collector and growth figures for launch universes include seeded demo data alongside live platform activity.
      </p>
    </>
  );
}
