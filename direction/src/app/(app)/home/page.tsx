import Link from "next/link";
import { ArrowRight, Calendar, Flame, Snowflake, Sparkles, Trophy } from "lucide-react";
import { Pip, type PipMood } from "@/components/brand/Pip";
import { CareerArt } from "@/components/career/CareerArt";
import { BonusButton } from "@/components/home/BonusButton";
import { MissionCard } from "@/components/mission/MissionCard";
import { ProgressBar, ProgressRing, SectionTitle } from "@/components/ui/primitives";
import { ACHIEVEMENTS } from "@/lib/content/achievements";
import { getCareer } from "@/lib/content/careers";
import { findMission } from "@/lib/content/paths";
import { challengeCompletedCount, CHALLENGE_DAYS, nextChallengeDay } from "@/lib/engine/challenge";
import { weeklyRecap } from "@/lib/engine/derive";
import { getTodayPlan } from "@/lib/server/services";
import { requireSession } from "@/lib/server/page";

export const metadata = { title: "Home" };

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/London" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function HomePage() {
  const s = await requireSession();
  const { state, overview: ov, today } = s;
  const plan = await getTodayPlan(s.viewer, state);
  const done = new Set(state.completions.map((c) => c.missionId));
  const todays = plan.missionIds.map((id) => findMission(id)).filter((x) => !!x);
  const doneCount = todays.filter((r) => done.has(r.mission.id)).length;
  const allDone = todays.length > 0 && doneCount === todays.length;
  const recap = weeklyRecap(state, today);
  const primary = ov.primary;
  const nextMission = primary?.nextMissionId ? findMission(primary.nextMissionId)?.mission : undefined;
  const ch = state.profile.challenge;
  const name = state.profile.displayName.split(" ")[0];
  const recent = state.achievements
    .slice()
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
    .slice(0, 4)
    .map((a) => ACHIEVEMENTS.find((x) => x.id === a.achievementId))
    .filter((a) => !!a);

  const mood: PipMood = allDone ? "proud" : ov.streak.atRisk ? "gentle" : doneCount > 0 ? "excited" : "wave";
  const line = allDone
    ? "You smashed today. Seriously proud of you."
    : ov.streak.atRisk
      ? `Your ${ov.streak.current}-day streak needs you! One small mission keeps it alive.`
      : doneCount > 0
        ? `${todays.length - doneCount} to go today. You've got this.`
        : primary
          ? `Ready for today? Your ${primary.title} path is waiting.`
          : "Let's pick a direction and get your first missions going.";

  return (
    <div className="space-y-8">
      <section className="flex items-center gap-4">
        <Pip mood={mood} size={88} />
        <div>
          <div className="eyebrow">{greeting()}</div>
          <h1 className="h-display text-3xl">Hey {name}</h1>
          <p className="mt-1 max-w-md text-ink-2">{line}</p>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2.5 md:gap-4">
        <Link href="/profile#streak" className="card flex flex-col items-center gap-2 p-3 text-center md:flex-row md:gap-4 md:p-4 md:text-left">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl md:h-14 md:w-14 ${ov.streak.doneToday ? "bg-coral text-white" : "bg-coral-soft text-coral"}`}>
            <Flame size={28} />
          </div>
          <div>
            <div className="font-display text-lg font-extrabold md:text-2xl">{ov.streak.current} day{ov.streak.current === 1 ? "" : "s"}</div>
            <div className="hidden items-center gap-1.5 text-xs font-semibold text-ink-3 md:flex">
              {ov.streak.doneToday ? "Done for today 🔥" : "Streak"} · <Snowflake size={12} /> {ov.streak.freezes} freeze{ov.streak.freezes === 1 ? "" : "s"}
            </div>
          </div>
        </Link>
        <Link href="/profile" className="card flex flex-col items-center gap-2 p-3 text-center md:flex-row md:gap-4 md:p-4 md:text-left">
          <ProgressRing value={ov.rankProgress} size={48}>
            <span className="font-display text-lg font-extrabold">{ov.rank}</span>
          </ProgressRing>
          <div>
            <div className="font-display text-lg font-extrabold">{ov.rankTitle}</div>
            <div className="hidden text-xs font-semibold text-ink-3 md:block">{ov.xpToNext} XP to rank {ov.rank + 1}</div>
          </div>
        </Link>
        <Link href="/recap" className="card flex flex-col items-center gap-2 p-3 text-center md:flex-row md:gap-4 md:p-4 md:text-left">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lavender-soft md:h-14 md:w-14 text-[#5B47C9] dark:text-lavender">
            <Calendar size={26} />
          </div>
          <div>
            <div className="font-display text-lg font-extrabold">This week</div>
            <div className="hidden text-xs font-semibold text-ink-3 md:block">
              {recap.missions} missions · {recap.xp} XP · {recap.activeDays}/7 days
            </div>
          </div>
        </Link>
      </div>

      <section>
        <SectionTitle
          eyebrow={`${doneCount}/${todays.length} complete`}
          title="Today's missions"
          action={
            <Link href="/missions" className="text-sm font-bold text-teal">
              All missions
            </Link>
          }
        />
        <ProgressBar value={todays.length ? doneCount / todays.length : 0} className="mb-3" label="Today's progress" />
        <div className="space-y-2.5">
          {todays.map((r) => (
            <MissionCard
              key={r.mission.id}
              mission={r.mission}
              done={done.has(r.mission.id)}
              href={`/missions/${r.mission.id}?from=home`}
              context={`${r.path.title} · L${r.level.n}`}
            />
          ))}
          {todays.length === 0 && (
            <div className="card p-6 text-center text-sm text-ink-2">
              No missions yet — <Link href="/path" className="font-bold text-teal">choose a path</Link> to get your first ones.
            </div>
          )}
        </div>
        {allDone && (
          <div className="mt-3">
            <BonusButton />
          </div>
        )}
      </section>

      {ch && !ch.finishedAt && (
        <Link href="/challenge" className="block overflow-hidden rounded-4xl bg-gradient-to-br from-navy to-[#2A2F7A] p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow !text-mint">30-Day Discovery Challenge</div>
              <div className="h-display mt-1 text-2xl">
                Day {nextChallengeDay(ch, today) ?? "✓"} of {CHALLENGE_DAYS}
              </div>
              <div className="mt-1 text-sm text-white/75">Exploring {ch.careers.map((c) => getCareer(c)?.title).join(", ")}</div>
            </div>
            <ProgressRing value={challengeCompletedCount(ch) / CHALLENGE_DAYS} size={64} tone="#7EE7C4">
              <span className="font-display font-extrabold">{challengeCompletedCount(ch)}</span>
            </ProgressRing>
          </div>
        </Link>
      )}

      {primary ? (
        <section>
          <SectionTitle eyebrow="Your path" title={primary.title} action={<Link href={`/path?career=${primary.careerSlug}`} className="text-sm font-bold text-teal">Open map</Link>} />
          <Link href={`/path?career=${primary.careerSlug}`} className="card block overflow-hidden">
            <CareerArt slug={primary.careerSlug} category={getCareer(primary.careerSlug)!.category} className="h-28" rounded={false} />
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Level {primary.progress.currentLevel} of 10</div>
                  <div className="font-display text-xl font-bold">{primary.progress.levels[primary.progress.currentLevel - 1]?.level.title}</div>
                </div>
                <div className="font-display text-2xl font-extrabold text-teal">{primary.progress.percent}%</div>
              </div>
              <ProgressBar value={primary.progress.percent / 100} className="mt-3" label="Path progress" />
              {nextMission && (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface-2 p-3 text-sm">
                  <span>
                    <span className="font-bold">Up next:</span> {nextMission.title}
                  </span>
                  <ArrowRight size={18} className="shrink-0 text-teal" />
                </div>
              )}
            </div>
          </Link>
        </section>
      ) : (
        <section>
          <SectionTitle eyebrow="Your top directions" title="Pick a path to start" />
          <div className="grid gap-3 md:grid-cols-3">
            {state.profile.matches.slice(0, 3).map((m) => {
              const c = getCareer(m.careerSlug)!;
              return (
                <Link key={c.slug} href={`/discover/${c.slug}`} className="card overflow-hidden">
                  <CareerArt slug={c.slug} category={c.category} className="h-24" rounded={false} />
                  <div className="p-4">
                    <div className="font-display font-bold">{c.title}</div>
                    <div className="text-sm font-bold text-teal">{m.percent}% match</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/coach" className="card flex items-center gap-4 p-5">
          <Pip mood="curious" size={64} animate={false} />
          <div>
            <div className="font-display text-lg font-bold">Talk to Pip</div>
            <p className="text-sm text-ink-2">Stuck on a mission, CV or big decision? Your coach knows where you are.</p>
          </div>
        </Link>
        <Link href="/profile#achievements" className="card p-5">
          <div className="flex items-center justify-between">
            <div className="font-display text-lg font-bold">
              <Trophy size={18} className="mr-1 inline text-sun" /> Badges
            </div>
            <span className="text-sm font-bold text-ink-3">
              {ov.achievementsUnlocked}/{ov.achievementsTotal}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            {recent.length ? recent.map((a) => (
              <span key={a.id} title={a.name} className="grid h-12 w-12 place-items-center rounded-2xl bg-sun-soft text-2xl">
                {a.emoji}
              </span>
            )) : <span className="text-sm text-ink-3">Complete your first mission to earn one.</span>}
          </div>
        </Link>
      </div>

      {state.profile.plan === "free" && (
        <Link href="/plus" className="flex items-center gap-4 rounded-4xl bg-gradient-to-r from-lavender-soft via-mint-soft to-sun-soft p-5">
          <Sparkles className="shrink-0 text-lavender" />
          <div className="flex-1">
            <div className="font-display font-bold">Go further with Direction Plus</div>
            <div className="text-sm text-ink-2">Multiple paths, unlimited coaching and interview practice.</div>
          </div>
          <ArrowRight className="shrink-0" />
        </Link>
      )}
    </div>
  );
}
