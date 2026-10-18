import Link from "next/link";
import { Check, Crown, Gift, Info } from "lucide-react";
import { Art } from "@/components/art/Art";
import { CardThumb } from "@/components/cards/CardThumb";
import { ChallengeClaim } from "@/components/daily/ChallengeClaim";
import { Countdown } from "@/components/ui/Countdown";
import { ShardIcon } from "@/components/ui/Currency";
import { btn, container, eyebrow } from "@/components/ui/styles";
import { isReleased, liveUniverses, releaseTime } from "@/lib/catalog";
import { DAY_MS } from "@/lib/clock";
import { hashString } from "@/lib/content/build";
import { challenges, dailyStatus } from "@/lib/services/daily";
import { faceFor } from "@/lib/view/face";
import { pageCtx } from "@/lib/view/page";

export const metadata = { title: "Daily Drops" };

export default async function DailyPage() {
  const { state, user, at, idx } = await pageCtx();
  const d = dailyStatus(state, user.id, at);
  const ch = challenges(state, user.id, at);
  const f = d.featured!;
  const inv = state.inventory[user.id] ?? {};
  const live = liveUniverses(state, at);
  const newCards = live
    .flatMap((u) => u.cards.filter((c) => isReleased(idx, c.releaseOffsetDays, at) && releaseTime(idx, c.releaseOffsetDays) > at - 7 * DAY_MS && c.releaseOffsetDays > u.launchOffsetDays).map((c) => ({ c, u })))
    .sort((a, b) => b.c.releaseOffsetDays - a.c.releaseOffsetDays)
    .slice(0, 12);
  const upcoming = idx.universes
    .flatMap((u) => [
      ...(u.status === "published" && !isReleased(idx, u.launchOffsetDays, at) ? [{ u, label: "Universe launch", at: releaseTime(idx, u.launchOffsetDays) }] : []),
      ...u.seasons.filter((s) => u.status === "published" && !isReleased(idx, s.releaseOffsetDays, at)).map((s) => ({ u, label: `Season ${s.number}: ${s.title}`, at: releaseTime(idx, s.releaseOffsetDays) })),
    ])
    .sort((a, b) => a.at - b.at)
    .slice(0, 8);

  return (
    <div className={`${container} pt-10`}>
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10" style={{ background: f.style.palette.bg }}>
        <div className="nx-animate absolute inset-0"><Art style={f.style.artStyle} palette={f.style.palette} seed={hashString(f.id + d.day)} aspect="hero" sceneOnly className="h-full w-full" /></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/10" />
        <div className="relative grid gap-8 p-6 md:grid-cols-[1.4fr_1fr] md:p-12">
          <div>
            <p className={eyebrow}>Daily drop · {new Date(at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-6xl">{d.claimed ? "You're all caught up." : "Your free pack is ready."}</h1>
            <p className="mt-4 max-w-lg text-bone-2">
              Today's featured world is <Link href={`/universes/${f.slug}`} className={`ff-${f.style.displayFont} text-xl`} style={{ color: f.style.palette.accent }}>{f.title}</Link>. Open your daily pack from it, or from any universe you like.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {d.claimed ? (
                <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-bone-3">Next drop in</p><Countdown to={d.nextResetAt} /></div>
              ) : (
                <>
                  <Link href={`/packs/daily?u=${f.slug}`} className={btn("primary", "lg")}><Gift size={18} /> Open today's pack</Link>
                  <Link href="/packs/daily" className={btn("glass", "lg")}>Choose another world</Link>
                </>
              )}
            </div>
          </div>
          <div className="glass self-end rounded-3xl p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-bone-3">7-day activity track</p>
            <ol className="mt-4 grid grid-cols-7 gap-1.5">
              {d.track.map((t) => (
                <li key={t.index} className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center ${t.claimed ? "bg-ember/20" : t.index === d.nextTrackIndex && !d.claimed ? "bg-white/10 ring-1 ring-ember" : "bg-white/[0.04]"}`}>
                  <span className="text-[10px] font-bold text-bone-3">D{t.index + 1}</span>
                  {t.claimed ? <Check size={16} className="text-ember-2" /> : t.bonus ? <Crown size={16} className="text-legendary" /> : <ShardIcon size={16} />}
                  <span className="text-[11px] font-bold tabular-nums">{t.shards}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] text-bone-3">Each claim moves you one step. Missing a day never resets your progress. Day 7 adds a Premium Pack token.</p>
          </div>
        </div>
      </section>

      <p className="mt-3 flex items-center gap-2 text-[12px] text-bone-4"><Info size={13} /> Daily drops and challenges reset at 00:00 UTC for every collector, wherever you are.</p>

      {d.pass !== "inactive" && (
        <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-legendary/30 bg-legendary/[0.06] p-5">
          <p className="flex items-center gap-2 font-semibold"><Crown className="text-legendary" size={18} /> Collector Pass bonus (demo): {d.pass === "active-claimed" ? "claimed today" : "3 extra cards ready"}</p>
          {d.pass === "active-available" && <Link href={`/packs/pass-daily?u=${f.slug}`} className={btn("light", "sm")}>Open bonus pack</Link>}
        </section>
      )}

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        {(["daily", "weekly"] as const).map((scope) => (
          <div key={scope}>
            <h2 className="text-xl font-extrabold">{scope === "daily" ? "Today's challenges" : "Weekly milestones"}</h2>
            <ul className="mt-4 space-y-2.5">
              {ch.filter((c) => c.scope === scope).map((c) => (
                <li key={c.key} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-2 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.title}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-ember" style={{ width: `${(c.progress / c.goal) * 100}%` }} /></div>
                      <span className="text-[12px] tabular-nums text-bone-3">{c.progress}/{c.goal}</span>
                    </div>
                  </div>
                  {c.claimed ? <span className="text-[12px] font-bold text-uncommon">Claimed</span> : c.progress >= c.goal ? <ChallengeClaim challengeKey={c.key} reward={c.reward} /> : <span className="flex items-center gap-1 text-[12px] font-semibold text-bone-3"><ShardIcon size={12} />{c.reward}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {newCards.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-extrabold">New card announcements</h2>
          <p className="mt-1 text-sm text-bone-3">Released this week alongside new episodes.</p>
          <div className="no-scrollbar -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-2">
            {newCards.map(({ c, u }) => <CardThumb key={c.id} face={faceFor(c, u)} locked={!inv[c.id]} className="w-[40vw] sm:w-[160px]" caption={u.title} />)}
          </div>
        </section>
      )}

      <section className="mt-14">
        <h2 className="text-xl font-extrabold">Coming soon</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {upcoming.map((x, i) => (
            <li key={i}>
              <Link href={`/universes/${x.u.slug}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-ink-2 p-3 hover:border-white/25">
                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl"><Art style={x.u.style.artStyle} palette={x.u.style.palette} seed={hashString(x.u.id)} aspect="hero" sceneOnly className="h-full w-full" /></div>
                <div className="min-w-0 flex-1">
                  <p className={`ff-${x.u.style.displayFont} truncate text-lg`} style={{ color: x.u.style.palette.accent }}>{x.u.title}</p>
                  <p className="truncate text-sm text-bone-3">{x.label}</p>
                </div>
                <span className="text-[12px] font-semibold text-bone-2"><Countdown to={x.at} compact /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
