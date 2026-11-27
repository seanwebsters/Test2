"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { dayKey, lastNDays } from "@/lib/date";
import { play } from "@/lib/feedback";
import { MAX_HEARTS, activeToday, currentHearts, dailyGoal, liveStreak, nextHeartIn, todayXp, useStore } from "@/lib/store";
import Mascot from "./Mascot";
import { Button, Progress, Sheet } from "./ui";
import { Crown, Flame, Gem, Heart, IconCompass, IconHome, IconSpark, IconTrophy, IconUser } from "./icons";

const TABS = [
  { href: "/learn", label: "Learn", Icon: IconHome },
  { href: "/challenges", label: "Challenges", Icon: IconTrophy },
  { href: "/playground", label: "Playground", Icon: IconSpark },
  { href: "/discover", label: "Discover", Icon: IconCompass },
  { href: "/profile", label: "Profile", Icon: IconUser },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-grape-100 bg-white/90 pb-[var(--safe-bottom)] backdrop-blur-xl">
      <div className="grid grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={() => play("tap")} className="relative flex flex-col items-center gap-0.5 pb-2 pt-2.5" aria-current={active ? "page" : undefined}>
              {active && <motion.span layoutId="tab-pill" className="absolute inset-x-3 top-1.5 h-9 rounded-2xl bg-grape-100" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <Icon size={24} className={`relative ${active ? "text-grape-600" : "text-ink-mute"}`} strokeWidth={active ? 2.5 : 2} />
              <span className={`relative text-[11px] font-bold ${active ? "text-grape-600" : "text-ink-mute"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function useNow(interval = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

export function StatsBar({ showLogo = true }: { showLogo?: boolean }) {
  const s = useStore();
  const now = useNow();
  const streak = liveStreak(s);
  const lit = activeToday(s);
  const hearts = currentHearts(s, now);
  const [sheet, setSheet] = useState<null | "streak" | "hearts">(null);

  return (
    <>
      <div className="flex items-center gap-2">
        {showLogo && (
          <Link href="/learn" className="mr-auto flex items-center gap-1.5">
            <Mascot size={34} float={false} bare />
            <span className="font-display text-[26px] font-semibold tracking-tight text-ink">AIBI</span>
          </Link>
        )}
        <button onClick={() => setSheet("streak")} className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-display text-[15px] font-semibold shadow-card active:scale-95" aria-label={`${streak} day streak`}>
          <Flame lit={lit} /> <span className={lit ? "text-sun-500" : "text-ink-mute"}>{streak}</span>
        </button>
        <Link href="/profile" className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-display text-[15px] font-semibold shadow-card active:scale-95" aria-label={`${s.xp} XP`}>
          <Gem /> <span className="text-grape-600">{s.xp}</span>
        </Link>
        <button onClick={() => setSheet("hearts")} className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-display text-[15px] font-semibold shadow-card active:scale-95" aria-label="Hearts">
          {s.plan === "plus" ? <><Crown size={20} /><span className="text-sun-500">∞</span></> : <><Heart /> <span className="text-coral-500">{hearts}</span></>}
        </button>
      </div>
      <StreakSheet open={sheet === "streak"} onClose={() => setSheet(null)} />
      <HeartsSheet open={sheet === "hearts"} onClose={() => setSheet(null)} />
    </>
  );
}

export function StreakSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const streak = liveStreak(s);
  const days = lastNDays(7);
  const goal = dailyGoal(s);
  const xp = todayXp(s);
  return (
    <Sheet open={open} onClose={onClose} title="Your streak">
      <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-sun-100 to-coral-100 p-4">
        <Flame size={64} lit={activeToday(s)} />
        <div>
          <div className="font-display text-4xl font-semibold text-ink">{streak} day{streak === 1 ? "" : "s"}</div>
          <div className="text-sm font-semibold text-ink-soft">Best: {s.streak.best} days</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const done = (s.xpByDay[d] ?? 0) > 0;
          const isToday = d === dayKey();
          const label = new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "narrow" });
          return (
            <div key={d} className="flex flex-col items-center gap-1">
              <span className={`text-xs font-bold ${isToday ? "text-grape-600" : "text-ink-mute"}`}>{label}</span>
              <span className={`grid h-9 w-9 place-items-center rounded-full ${done ? "bg-gradient-to-b from-sun-300 to-sun-500" : "bg-lav-100"} ${isToday ? "ring-2 ring-grape-400 ring-offset-2" : ""}`}>
                {done ? <Flame size={18} /> : null}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-2xl bg-lav-100 p-4">
        <div className="flex justify-between text-sm font-bold">
          <span>Today&apos;s goal</span>
          <span className="text-grape-600">{Math.min(xp, goal)} / {goal} XP</span>
        </div>
        <Progress value={xp / goal} className="mt-2" color={xp >= goal ? "mint" : "grape"} />
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-sky-100 p-4">
        <span className="text-2xl">🧊</span>
        <div className="flex-1 text-sm">
          <div className="font-bold">Streak freezes: {s.streak.freezes}</div>
          <div className="text-ink-soft">Miss one day and a freeze keeps your streak alive automatically.</div>
        </div>
      </div>
      <Button full className="mt-5" href="/learn" onClick={onClose}>
        {activeToday(s) ? "Keep learning" : "Do a lesson to keep it going"}
      </Button>
    </Sheet>
  );
}

export function HeartsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const now = useNow(1000);
  const hearts = currentHearts(s, now);
  const ms = nextHeartIn(s, now);
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return (
    <Sheet open={open} onClose={onClose} title="Hearts">
      {s.plan === "plus" ? (
        <div className="flex flex-col items-center py-4 text-center">
          <Crown size={56} />
          <div className="mt-2 font-display text-2xl font-semibold">Unlimited hearts</div>
          <p className="mt-1 text-ink-soft">You&apos;re on AIBI Plus — learn as much as you like, mistakes and all.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center gap-2 py-3">
            {Array.from({ length: MAX_HEARTS }, (_, i) => (
              <Heart key={i} size={40} full={i < hearts} />
            ))}
          </div>
          <p className="text-center text-ink-soft">
            {hearts >= MAX_HEARTS ? "You're at full hearts. You lose one for each mistake in a lesson." : `Next heart in ${mins}:${String(secs).padStart(2, "0")}. Hearts refill one every 30 minutes.`}
          </p>
          <div className="mt-5 rounded-3xl bg-gradient-to-br from-sun-100 to-lav-100 p-4">
            <div className="flex items-center gap-2 font-display text-lg font-semibold"><Crown /> Unlimited hearts with Plus</div>
            <p className="mt-1 text-sm text-ink-soft">Never wait to keep learning. Plus also unlocks all 8 worlds.</p>
            <Button variant="gold" full className="mt-3" href="/plus" onClick={onClose}>Try AIBI Plus</Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
