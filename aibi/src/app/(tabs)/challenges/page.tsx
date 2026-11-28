"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { StatsBar } from "@/components/AppChrome";
import Mascot from "@/components/Mascot";
import { Button, Card, Progress } from "@/components/ui";
import { IconShare } from "@/components/icons";
import { challengeById, todaysChallenge } from "@/content/challenges";
import { dayKey, lastNDays } from "@/lib/date";
import { levelInfo } from "@/lib/gamification";
import { leaderboard, leagueFor, timeLeftInWeek } from "@/lib/league";
import { shareCard } from "@/lib/share";
import { dailyGoal, todayXp, useStore, weeklyXp } from "@/lib/store";

export default function ChallengesPage() {
  const s = useStore();
  const today = dayKey();
  const ch = todaysChallenge(s.profile, today);
  const done = s.challenges[today];
  const level = levelInfo(s.xp).level;
  const league = leagueFor(level);
  const rows = useMemo(() => leaderboard(s.profile?.name ?? "You", weeklyXp(s), level), [s, level]);
  const youRank = rows.findIndex((r) => r.you) + 1;
  const [sharing, setSharing] = useState(false);
  const lessonsToday = Object.values(s.completed).filter((c) => c.at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const goal = dailyGoal(s);
  const quests = [
    { icon: "⚡", label: `Earn ${goal} XP`, value: todayXp(s), max: goal },
    { icon: "📘", label: "Complete 2 lessons", value: lessonsToday, max: 2 },
    { icon: "🏅", label: "Finish the daily challenge", value: done ? 1 : 0, max: 1 },
  ];

  return (
    <div>
      <div className="sticky top-0 z-30 bg-lav-50/85 px-4 pb-3 pt-[calc(12px+var(--safe-top))] backdrop-blur-xl">
        <StatsBar />
      </div>
      <div className="px-5">
        <h1 className="font-display text-[28px] font-semibold">Challenges</h1>
        <p className="text-sm text-ink-soft">One practical AI challenge a day, picked for you.</p>

        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative mt-4 overflow-hidden rounded-[30px] p-5 text-white shadow-float" style={{ background: `linear-gradient(140deg, ${ch.gradient[0]}, ${ch.gradient[1]})` }}>
          <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/15" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/85">
              Today&apos;s challenge · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
            </div>
            <div className="mt-3 flex items-start gap-3">
              <span className="text-5xl drop-shadow">{ch.emoji}</span>
              <h2 className="font-display text-[24px] font-semibold leading-tight">{ch.title}</h2>
            </div>
            <p className="mt-2 text-[14px] font-semibold text-white/90">{ch.task.brief}</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-white/25 px-3 py-1 text-xs font-black">+30 XP</span>
              <span className="rounded-full bg-white/25 px-3 py-1 text-xs font-black">≈ 5 min</span>
            </div>
            <div className="mt-4 flex gap-2">
              {done ? (
                <>
                  <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white/20 px-4 font-display font-semibold">✅ Done · scored {done.score}</div>
                  <Button
                    variant="white"
                    size="md"
                    disabled={sharing}
                    onClick={async () => {
                      setSharing(true);
                      await shareCard(
                        { eyebrow: "Daily AI challenge", title: ch.title, subtitle: `I scored ${done.score}/100 on today's AIBI challenge`, badge: ch.emoji, stat: { value: `${done.score}`, label: "Prompt score" }, accent: ch.gradient[0] },
                        `I just completed today's AIBI challenge: "${ch.title}" ${ch.emoji} Can you beat ${done.score}/100?`,
                      );
                      setSharing(false);
                    }}
                  >
                    <IconShare size={16} /> Share
                  </Button>
                </>
              ) : (
                <Button variant="white" full href="/challenge">Start challenge</Button>
              )}
            </div>
          </div>
        </motion.div>

        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {lastNDays(7).map((d) => {
            const c = s.challenges[d];
            const isToday = d === today;
            return (
              <div key={d} className="flex flex-col items-center gap-1">
                <span className={`text-[11px] font-bold ${isToday ? "text-grape-600" : "text-ink-mute"}`}>{new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" })}</span>
                <span className={`grid h-10 w-10 place-items-center rounded-2xl text-lg ${c ? "bg-white shadow-card" : "bg-lav-100"} ${isToday ? "ring-2 ring-grape-400" : ""}`}>{c ? challengeById(c.id)?.emoji ?? "🏅" : ""}</span>
              </div>
            );
          })}
        </div>

        <h2 className="mt-7 font-display text-xl font-semibold">Daily quests</h2>
        <Card className="mt-3 divide-y divide-grape-100">
          {quests.map((q) => (
            <div key={q.label} className="flex items-center gap-3 p-4">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lav-100 text-xl">{q.value >= q.max ? "✅" : q.icon}</span>
              <div className="flex-1">
                <div className="text-[15px] font-bold">{q.label}</div>
                <Progress value={q.value / q.max} height={9} className="mt-1.5" color={q.value >= q.max ? "mint" : "sun"} />
              </div>
              <span className="w-12 text-right text-sm font-black text-ink-mute">{Math.min(q.value, q.max)}/{q.max}</span>
            </div>
          ))}
        </Card>

        <div className="mt-7 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">{league.icon} {league.name} League</h2>
            <p className="text-sm text-ink-soft">Top 3 move up · {timeLeftInWeek()}</p>
          </div>
          <span className="rounded-full bg-grape-100 px-3 py-1 text-sm font-black text-grape-700">#{youRank}</span>
        </div>
        <Card className="mt-3 overflow-hidden">
          {rows.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-3 px-4 py-2.5 ${r.you ? "bg-grape-50" : ""} ${i === 3 ? "border-t-2 border-dashed border-mint-400" : i > 0 ? "border-t border-grape-100/70" : ""} ${i === rows.length - 3 ? "border-t-2 border-dashed border-coral-400" : ""}`}>
              <span className={`w-6 text-center font-display font-semibold ${i < 3 ? "text-sun-500" : "text-ink-mute"}`}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
              {r.you ? (
                <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-lav-100"><Mascot size={32} float={false} /></span>
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full text-xl" style={{ background: `${r.color}22` }}>{r.avatar}</span>
              )}
              <span className={`flex-1 font-bold ${r.you ? "text-grape-700" : ""}`}>{r.you ? `${r.name} (you)` : r.name}</span>
              <span className="font-display font-semibold text-ink-soft">{r.xp} XP</span>
            </div>
          ))}
        </Card>
        <p className="mt-2 px-1 text-xs text-ink-mute">Earn XP from lessons and challenges to climb. Leagues reset every Monday.</p>
      </div>
    </div>
  );
}
