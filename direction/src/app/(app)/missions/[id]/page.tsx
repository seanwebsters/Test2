import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";
import { formatMinutes, KIND_META } from "@/components/mission/kinds";
import { MissionRunner } from "@/components/mission/MissionRunner";
import { Pip } from "@/components/brand/Pip";
import { Pill } from "@/components/ui/primitives";
import { findMission } from "@/lib/content/paths";
import { skillName } from "@/lib/content/skills";
import { challengeDay, challengeUnlockedDay } from "@/lib/engine/challenge";
import { MAX_PLACEMENT_LEVEL, pathProgress } from "@/lib/engine/progression";
import { baseXp } from "@/lib/engine/xp";
import { getTodayPlan } from "@/lib/server/services";
import { requireSession } from "@/lib/server/page";

export default async function MissionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placement?: string; from?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const s = await requireSession();
  const ref = findMission(id);
  if (!ref) notFound();
  const { mission, level, path } = ref;
  const meta = KIND_META[mission.kind];
  const done = s.state.completions.find((c) => c.missionId === id);
  const up = s.state.paths.find((p) => p.careerSlug === path.careerSlug);
  const progress = pathProgress(path, s.state.completions.filter((c) => c.careerSlug === path.careerSlug).map((c) => c.missionId), up?.skippedThrough ?? 0);
  const lp = progress.levels.find((l) => l.level.n === level.n)!;
  const mp = lp.missions.find((m) => m.mission.id === id)!;
  const plan = await getTodayPlan(s.viewer, s.state);
  const inDaily = plan.missionIds.includes(id);

  let chDay: number | null = null;
  const ch = s.state.profile.challenge;
  if (ch && !ch.finishedAt) {
    const unlocked = challengeUnlockedDay(ch, s.today);
    for (let d = 1; d <= unlocked; d++) if (!ch.completed[String(d)] && challengeDay(ch.careers, d).mission.id === id) chDay = d;
  }
  const placement = sp.placement === "1" && !!mission.quest && level.n <= MAX_PLACEMENT_LEVEL && !!up && (lp.status === "locked" || lp.status === "available");

  let blocked: string | null = null;
  if (!done && !chDay && !placement) {
    if (!up && level.n !== 1) blocked = "Start this path to unlock its missions.";
    else if (up?.status === "paused" && level.n > 1 && !inDaily) blocked = "This path is paused. Resume it from My Path to keep going — your progress is saved.";
    else if (!mp.available) blocked = mp.lockedReason;
  }
  const returnTo = sp.from === "path" ? `/path?career=${path.careerSlug}` : sp.from === "challenge" ? "/challenge" : sp.from === "home" ? "/home" : "/missions";
  const xp = Math.round(baseXp(mission.minutes) * (mission.quest ? 1.5 : 1));

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={returnTo} className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-ink-3 hover:text-ink">
        <ArrowLeft size={16} /> Back
      </Link>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={mission.quest ? "sun" : "surface"}>
            <meta.icon size={13} /> {meta.label}
          </Pill>
          <Pill>
            <Clock size={13} /> {formatMinutes(mission.minutes)}
          </Pill>
          <Pill tone="teal">+{xp} XP</Pill>
          {inDaily && <Pill tone="coral">Today&apos;s mission</Pill>}
          {chDay && <Pill tone="lavender">Challenge · Day {chDay}</Pill>}
        </div>
        <h1 className="h-display mt-3 text-3xl text-balance">{mission.title}</h1>
        <p className="mt-1 text-sm font-semibold text-ink-3">
          {path.title} · Level {level.n}: {level.title}
        </p>
        <p className="mt-3 text-lg text-ink-2">{mission.objective}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {mission.skills.map((sk) => (
            <span key={sk.id} className="chip !py-1 !text-xs">
              <Sparkles size={12} className="text-teal" /> {skillName(sk.id)} +{sk.points}
            </span>
          ))}
        </div>
      </div>

      {placement && (
        <div className="mb-5 rounded-3xl bg-lavender-soft p-4 text-sm">
          <strong>Skip-ahead challenge.</strong> Already have this experience? Complete this quest with real evidence and levels 1–{level.n} will be marked as skipped. Your earlier levels stay open if you want to revisit them.
        </div>
      )}

      {done ? (
        <div className="card flex flex-col items-center p-8 text-center">
          <Pip mood="proud" size={100} />
          <h2 className="h-display mt-3 text-xl">Completed on {new Date(done.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</h2>
          <p className="mt-1 text-sm text-ink-2">+{done.xp} XP earned</p>
          {done.evidence && <blockquote className="mt-4 w-full rounded-2xl bg-surface-2 p-4 text-left text-sm">{done.evidence}</blockquote>}
          {done.reflection && <p className="mt-2 text-sm italic text-ink-2">“{done.reflection}”</p>}
          <Link href={returnTo} className="btn-primary mt-5">
            Back to missions
          </Link>
        </div>
      ) : blocked ? (
        <div className="card flex flex-col items-center p-8 text-center">
          <Pip mood="gentle" size={90} />
          <p className="mt-3 font-display text-lg font-bold">{blocked}</p>
          <Link href={`/path?career=${path.careerSlug}`} className="btn-primary mt-4">
            Go to my path
          </Link>
        </div>
      ) : (
        <MissionRunner mission={mission} placement={placement} challengeDay={chDay} returnTo={returnTo} />
      )}
    </div>
  );
}
