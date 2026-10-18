import Link from "next/link";
import { Flame, Settings, Snowflake } from "lucide-react";
import { PassportItems } from "@/components/passport/PassportItems";
import { ShareCard } from "@/components/passport/ShareCard";
import { ProgressBar, ProgressRing, SectionTitle } from "@/components/ui/primitives";
import { ACHIEVEMENTS } from "@/lib/content/achievements";
import { getCareer } from "@/lib/content/careers";
import { findMission } from "@/lib/content/paths";
import { SKILL_FAMILIES } from "@/lib/content/skills";
import type { SkillFamily } from "@/lib/content/types";
import { computeStats } from "@/lib/engine/achievements";
import { addDays } from "@/lib/engine/dates";
import { buildTimeline } from "@/lib/engine/timeline";
import { requireSession } from "@/lib/server/page";
import { cn } from "@/lib/cn";

export const metadata = { title: "Your Passport" };

export default async function ProfilePage() {
  const s = await requireSession();
  const { state, overview: ov, today } = s;
  const p = state.profile;
  const stats = computeStats(state);
  const unlocked = new Map(state.achievements.map((a) => [a.achievementId, a.unlockedAt]));
  const activeDays = new Set(state.completions.map((c) => c.day));
  const frozen = new Set(p.streak.frozenDays);
  const days = Array.from({ length: 35 }, (_, i) => addDays(today, i - 34));
  const projects = state.completions
    .filter((c) => c.evidence && findMission(c.missionId)?.mission.tags?.some((t) => t === "project" || t === "portfolio"))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const timeline = buildTimeline(state).slice(0, 12);
  const families = Object.keys(SKILL_FAMILIES) as SkillFamily[];
  const direction = ov.primary ? getCareer(ov.primary.careerSlug) : p.matches[0] ? getCareer(p.matches[0].careerSlug) : undefined;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-5xl bg-gradient-to-br from-navy via-[#1A2A63] to-[#3B2D8F] p-6 text-white">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full border-[18px] border-white/5" aria-hidden="true" />
        <div className="absolute -bottom-16 right-16 h-40 w-40 rounded-full border-[14px] border-mint/10" aria-hidden="true" />
        <div className="relative flex items-start justify-between">
          <div className="eyebrow !text-mint">Direction Passport</div>
          <Link href="/profile/settings" className="rounded-full p-2 text-white/70 hover:bg-white/10" aria-label="Settings">
            <Settings size={20} />
          </Link>
        </div>
        <div className="relative mt-3 flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-mint to-teal font-display text-3xl font-extrabold text-navy ring-4 ring-white/20">{p.displayName.slice(0, 1).toUpperCase()}</div>
          <div>
            <h1 className="h-display text-3xl">{p.displayName}</h1>
            <div className="text-sm text-white/70">@{p.handle}</div>
            {direction && <div className="mt-1 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold">🧭 {ov.primary ? "On the path to" : "Exploring"} {direction.title}</div>}
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-4 gap-2 text-center">
          {[
            [ov.totalXp.toLocaleString(), "XP"],
            [String(ov.rank), ov.rankTitle],
            [String(stats.missionsCompleted), "Missions"],
            [`${ov.achievementsUnlocked}`, "Badges"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-2xl bg-white/10 px-1 py-2.5">
              <div className="truncate font-display text-lg font-extrabold">{v}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-white/60">{l}</div>
            </div>
          ))}
        </div>
        {p.plan === "plus" && <div className="relative mt-3 inline-flex rounded-full bg-lavender px-3 py-1 text-xs font-extrabold text-navy">✦ Direction Plus</div>}
      </section>

      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <section id="streak" className="card scroll-mt-20 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="text-coral" size={28} />
              <div>
                <div className="font-display text-2xl font-extrabold">{ov.streak.current}-day streak</div>
                <div className="text-xs font-semibold text-ink-3">Longest: {ov.streak.longest} days</div>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-lavender-soft px-3 py-1.5 text-sm font-bold">
              <Snowflake size={15} /> {ov.streak.freezes}/2
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Activity in the last five weeks">
            {days.map((d) => (
              <div
                key={d}
                title={d}
                className={cn("aspect-square rounded-lg", activeDays.has(d) ? "bg-coral" : frozen.has(d) ? "bg-lavender" : "bg-surface-3", d === today && "ring-2 ring-ink ring-offset-2 ring-offset-surface")}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-3">Do one mission a day to grow your streak. Every 7 days you earn a streak freeze (max 2), which automatically covers a missed day. Miss more and your streak restarts — but your longest streak and all your progress stay forever.</p>
        </section>
        <ShareCard handle={p.handle} isPublic={p.privacy.passportPublic} />
      </div>

      <section>
        <SectionTitle eyebrow="Transferable across every path" title="Skill tree" />
        {ov.skills.length === 0 ? (
          <p className="text-sm text-ink-3">Complete missions to start growing skills.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {families
              .map((f) => ({ f, skills: ov.skills.filter((sk) => sk.family === f) }))
              .filter((x) => x.skills.length)
              .map(({ f, skills }) => (
                <div key={f} className="card p-5">
                  <h3 className="font-display font-bold">{SKILL_FAMILIES[f].name}</h3>
                  <div className="mt-3 space-y-3">
                    {skills.slice(0, 6).map((sk) => (
                      <div key={sk.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold">{sk.name}</span>
                          <span className="text-xs font-bold text-ink-3">
                            {sk.tierName} · {sk.points} pts
                          </span>
                        </div>
                        <div className="mt-1 flex gap-1" aria-hidden="true">
                          {[1, 2, 3, 4, 5].map((t) => (
                            <div key={t} className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                              <div className="h-full rounded-full bg-teal" style={{ width: sk.tier >= t ? "100%" : sk.tier + 1 === t ? `${sk.progress * 100}%` : "0%" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      <section id="achievements" className="scroll-mt-20">
        <SectionTitle eyebrow={`${ov.achievementsUnlocked} of ${ov.achievementsTotal}`} title="Badges" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {ACHIEVEMENTS.map((a) => {
            const at = unlocked.get(a.id);
            const prog = a.progress(stats);
            return (
              <div key={a.id} className={cn("card flex flex-col items-center p-3 text-center", !at && "opacity-60")} title={at ? a.description : a.hint}>
                <ProgressRing value={at ? 1 : prog} size={64} stroke={5} tone={at ? "#FFCE54" : "#8089A5"}>
                  <span className={cn("text-2xl", !at && "grayscale")}>{a.emoji}</span>
                </ProgressRing>
                <div className="mt-2 font-display text-xs font-bold leading-tight">{a.name}</div>
                <div className="mt-0.5 text-[10px] text-ink-3">{at ? new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : a.hint}</div>
              </div>
            );
          })}
        </div>
      </section>

      {ov.paths.length > 0 && (
        <section>
          <SectionTitle title="Career milestones" />
          <div className="grid gap-3 md:grid-cols-2">
            {ov.paths.map((pp) => (
              <Link key={pp.careerSlug} href={`/path?career=${pp.careerSlug}`} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-display font-bold">{pp.title}</div>
                  <span className="text-xs font-bold text-ink-3">{pp.status === "active" ? "Active" : "Paused"}</span>
                </div>
                <div className="mt-1 text-sm text-ink-2">{pp.progress.completedLevels} of 10 levels · {pp.progress.percent}%</div>
                <ProgressBar value={pp.progress.percent / 100} className="mt-2" label={`${pp.title} progress`} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle eyebrow="From your missions" title="Projects & portfolio" />
        {projects.length === 0 ? (
          <p className="text-sm text-ink-3">Projects you complete with evidence will appear here automatically.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {projects.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="text-[11px] font-bold uppercase text-ink-3">{getCareer(c.careerSlug)?.title}</div>
                <div className="font-display font-bold">{findMission(c.missionId)?.mission.title.replace(/^Quest: /, "")}</div>
                <p className="mt-1 line-clamp-3 text-sm text-ink-2">{c.evidence}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="Experience, education & certifications" />
        <PassportItems items={state.passport} />
      </section>

      <section>
        <SectionTitle title="Your timeline" />
        <ol className="relative space-y-4 border-l-2 border-line pl-6">
          {timeline.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[37px] grid h-7 w-7 place-items-center rounded-full bg-surface text-sm shadow-card">{e.emoji}</span>
              <div className="text-xs font-bold text-ink-3">{new Date(e.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
              <div className="font-display font-bold">{e.title}</div>
              {e.detail && <div className="text-sm text-ink-2">{e.detail}</div>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
