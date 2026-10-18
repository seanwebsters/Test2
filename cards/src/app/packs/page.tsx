import Link from "next/link";
import { Check, Crown, Gift, Info, Package, Sparkles, Ticket } from "lucide-react";
import { OddsTable } from "@/components/packs/OddsTable";
import { PackFace } from "@/components/packs/PackOpener";
import { PassToggle } from "@/components/packs/PassToggle";
import { DustIcon, ShardIcon } from "@/components/ui/Currency";
import { Countdown } from "@/components/ui/Countdown";
import { btn, chip, container, eyebrow } from "@/components/ui/styles";
import { liveUniverses } from "@/lib/catalog";
import { PACK_TYPES, type PackTypeId } from "@/lib/economy/packs";
import { dailyStatus, featuredOfDay } from "@/lib/services/daily";
import { hasPass } from "@/lib/services/users";
import { packAvailability, packUniverse } from "@/lib/view/packs";
import { pageCtx } from "@/lib/view/page";

export const metadata = { title: "Packs" };

export default async function PacksPage() {
  const { state, user, at } = await pageCtx();
  const live = liveUniverses(state, at);
  const featured = featuredOfDay(state, at) ?? live[0]!;
  const followed = live.find((u) => state.follows.some((f) => f.userId === user.id && f.universeId === u.id)) ?? featured;
  const w = state.wallets[user.id] ?? { shards: 0, stardust: 0, tokens: {} };
  const daily = dailyStatus(state, user.id, at);
  const pass = hasPass(user, at);

  const shelf: { type: PackTypeId; icon: typeof Package; universe: typeof live[number]; highlight?: string; token?: boolean }[] = [
    ...(!user.starterClaimed ? [{ type: "starter" as const, icon: Gift, universe: followed, highlight: "Start here" }] : []),
    { type: "daily", icon: Gift, universe: featured, highlight: daily.claimed ? undefined : "Ready" },
    ...(pass ? [{ type: "pass-daily" as const, icon: Crown, universe: followed }] : []),
    { type: "standard", icon: Package, universe: followed },
    { type: "premium", icon: Sparkles, universe: followed },
    ...((w.tokens.premium ?? 0) > 0 ? [{ type: "premium" as const, icon: Ticket, universe: followed, token: true, highlight: `${w.tokens.premium} token${w.tokens.premium === 1 ? "" : "s"}` }] : []),
  ];

  return (
    <div className={`${container} pt-10`}>
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className={eyebrow}>Packs</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">A universe in every pack.</h1>
          <p className="mt-3 max-w-xl text-bone-2">Every pack is drawn on our servers and saved to your collection instantly. Odds are published below and apply to every collector equally.</p>
        </div>
        <div className="glass flex items-center gap-5 rounded-2xl px-5 py-3 text-sm">
          <span className="flex items-center gap-2"><ShardIcon size={18} /><b className="tabular-nums">{w.shards}</b> Shards</span>
          <span className="flex items-center gap-2"><DustIcon size={18} /><b className="tabular-nums">{w.stardust}</b> Stardust</span>
        </div>
      </header>

      <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shelf.map(({ type, icon: Icon, universe, highlight, token }) => {
          const t = PACK_TYPES[type];
          const avail = packAvailability(state, user, type, at, { useToken: token });
          return (
            <Link key={`${type}${token ? "t" : ""}`} href={`/packs/${type}?u=${universe.slug}${token ? "&token=1" : ""}`} className="focus-ring group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-ink-2 p-5 transition hover:border-white/25">
              <div className="relative mx-auto h-56 w-40 transition duration-500 group-hover:-translate-y-1 group-hover:rotate-[-2deg]">
                <PackFace universe={packUniverse(universe)} packName={t.name} cardCount={t.slots.length} />
              </div>
              <div className="mt-5 flex items-center gap-2">
                <Icon size={16} className="text-ember-2" />
                <h2 className="text-lg font-bold">{token ? "Premium Pack (token)" : t.name}</h2>
                {highlight && <span className="ml-auto rounded-full bg-ember px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink">{highlight}</span>}
              </div>
              <p className="mt-1 text-[13px] text-bone-3">{t.description}</p>
              <div className="mt-auto flex items-center justify-between pt-4 text-[13px] font-semibold">
                <span className={avail.blocked ? "text-bone-4" : "text-bone"}>{avail.costLabel}</span>
                {t.proposedPrice && !token && <span className="text-[11px] text-bone-4" title="Proposed future price. Real-money purchases are disabled.">Proposed {t.proposedPrice}</span>}
                {type === "daily" && daily.claimed && <span className="text-[12px] text-bone-3">Next in <Countdown to={daily.nextResetAt} compact /></span>}
              </div>
            </Link>
          );
        })}
      </section>

      <section className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[13px] text-bone-2">
        <Info size={18} className="mt-0.5 shrink-0 text-bone-3" />
        <p>
          <b>No real money in this build.</b> Standard and Premium packs show proposed prices for the future commercial model, but here they're bought with Shards you earn for free (daily drops, reading, challenges, achievements). Paid random packs will only be enabled after legal, age-rating, consumer-protection and app-store policy review. There is no cash-out and no trading for money.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-extrabold tracking-tight">Pick a universe</h2>
        <p className="mt-1 text-sm text-bone-3">Standard and Premium packs draw from a single universe's released cards.</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {live.map((u) => (
            <Link key={u.id} href={`/packs/standard?u=${u.slug}`} className="focus-ring group overflow-hidden rounded-2xl border border-white/10 p-3 transition hover:border-white/30" style={{ background: u.style.palette.bg }}>
              <div className="mx-auto h-36 w-24 transition group-hover:-translate-y-1">
                <PackFace universe={packUniverse(u)} packName="Standard" cardCount={5} />
              </div>
              <p className={`ff-${u.style.displayFont} mt-3 text-center text-[17px]`} style={{ color: u.style.palette.ink }}>{u.title}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-5 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl border border-legendary/30 bg-gradient-to-br from-[#2a1f08] via-ink-2 to-ink-2 p-6">
          <p className={eyebrow}>Membership · proposed £6.99/month</p>
          <h2 className="mt-2 flex items-center gap-2 text-2xl font-extrabold"><Crown className="text-legendary" /> Collector Pass</h2>
          <ul className="mt-4 space-y-2 text-sm text-bone-2">
            {["A second free pack every day (3 cards)", "Early access to selected episodes", "Exclusive cosmetic treatments and binder themes (planned)", "Free-to-play collecting stays fully complete-able without it"].map((x) => (
              <li key={x} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-legendary" />{x}</li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {pass && <span className={chip}>Active until {new Date(user.collectorPassUntil!).toLocaleDateString("en-GB", { timeZone: "UTC" })}</span>}
            <PassToggle active={pass} />
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-ink-2 p-6">
          <p className={eyebrow}>Seasonal · planned</p>
          <h2 className="mt-2 text-2xl font-extrabold">Season Pass & Special Drops</h2>
          <p className="mt-3 text-sm text-bone-2">Season-specific cosmetics, editorial extras and limited themed releases. The data model and provider interface exist (see docs/MONETISATION.md); purchase flows are not enabled.</p>
          <Link href="/daily" className={`${btn("glass", "sm")} mt-5`}>See this week's drops</Link>
        </div>
      </section>

      <section className="mt-14 rounded-3xl border border-white/10 bg-ink-2 p-6" id="odds">
        <h2 className="text-2xl font-extrabold tracking-tight">Published odds</h2>
        <p className="mt-1 text-sm text-bone-3">Rarity is chosen per slot, then a card is chosen uniformly within that rarity from the pack's pool. Cosmetic variants roll separately. If a pool has no card of the rolled rarity, the nearest lower rarity is used (never below the guarantee). Last updated {new Date(state.economy.updatedAt).toUTCString()}.</p>
        <div className="mt-6">
          <OddsTable config={state.economy} />
        </div>
      </section>
    </div>
  );
}
