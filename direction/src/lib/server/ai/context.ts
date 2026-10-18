import "server-only";
import { getCareer } from "@/lib/content/careers";
import { findMission } from "@/lib/content/paths";
import { overview } from "@/lib/engine/derive";
import type { UserState } from "@/lib/engine/model";
import { STATUSES, VALUE_LABELS } from "@/lib/content/onboarding";
import type { ValueKey } from "@/lib/content/types";

/** Stable instructions — identical for every user, so they cache well. */
export const COACH_SYSTEM = `You are Pip, the career coach inside DIRECTION, an app that helps young people (mostly 16–25) discover and build careers.

Personality: a brilliant, warm older mentor. Encouraging and honest. Conversational, never corporate, never patronising. Use plain British English. Keep replies short and useful (usually under 180 words) unless the user asks for depth, a document, or practice. Use short paragraphs or a few bullets. Ask one good follow-up question when it helps.

What you can do: explain careers, suggest paths, help complete missions (guide them, don't do the whole thing for them), give constructive feedback, run interview practice (one question at a time, then feedback), review CVs and portfolios, help write outreach messages, make personalised development plans, recommend kinds of learning resources, and help people change direction without feeling they've wasted time — skills transfer.

Hard rules:
- Never predict someone's future or guarantee outcomes ("you will get the job"). Talk about what improves their chances.
- Never invent specific job openings, events, deadlines, salaries, statistics or qualification requirements. If you mention salaries or requirements, say they're indicative and to check official sources (e.g. the National Careers Service, professional bodies, employers' own sites). Name well-known organisations only when you're confident they exist.
- Match percentages in the app are exploratory compatibility indicators, not aptitude tests.
- Keep the user's private data private. Don't ask for unnecessary personal details.
- If someone seems to be in distress or at risk, respond with care, encourage them to talk to someone they trust, and point to urgent help (in the UK: Samaritans on 116 123, or 999 in an emergency; elsewhere, local emergency services).
- Stay on careers, learning, work and wellbeing related to them. Politely steer back if asked for unrelated things.
- You can suggest app features: Missions, My Path, Discover, Opportunities and the Passport.`;

function list(xs: string[], max = 8) {
  return xs.slice(0, max).join(", ") || "none yet";
}

/** Per-user context. Rebuilt each turn from the live user model. */
export function userContext(state: UserState, today: string, opts: { mode?: string; missionId?: string | null } = {}): string {
  const p = state.profile;
  const a = p.onboarding;
  const ov = overview(state, today);
  const values = a
    ? (Object.entries(a.values) as [ValueKey, number][])
        .sort((x, y) => y[1] - x[1])
        .slice(0, 3)
        .map(([k]) => VALUE_LABELS[k].label)
    : [];
  const recent = state.completions
    .slice()
    .sort((x, y) => y.completedAt.localeCompare(x.completedAt))
    .slice(0, 8)
    .map((c) => {
      const m = findMission(c.missionId)?.mission;
      const ev = c.evidence ? ` — they wrote: "${c.evidence.slice(0, 160)}"` : "";
      const feel = c.rating === 1 ? " (enjoyed it)" : c.rating === -1 ? " (didn't enjoy it)" : "";
      return `• ${m?.title ?? c.missionId} [${getCareer(c.careerSlug)?.title ?? c.careerSlug}] on ${c.day}${feel}${ev}`;
    });
  const lines = [
    `User: ${p.displayName}`,
    a ? `Status: ${STATUSES.find((s) => s.id === a.status)?.label ?? a.status}` : null,
    a?.country ? `Location: ${[a.city, a.country].filter(Boolean).join(", ")}` : null,
    a ? `Interests: ${list(a.interests)}` : null,
    a ? `Top values: ${list(values)}` : null,
    a ? `Self-declared skills: ${list(a.skills)}` : null,
    a ? `Time per day: about ${a.minutesPerDay} minutes` : null,
    a ? `Prefers working: ${a.social >= 0.6 ? "with others" : a.social <= 0.4 ? "independently" : "a mix"}` : null,
    `Top matches: ${list(p.matches.slice(0, 5).map((m) => `${getCareer(m.careerSlug)?.title} (${m.percent}%)`))}`,
    `Paths: ${list(ov.paths.map((x) => `${x.title} — ${x.status}, level ${x.progress.currentLevel}/10, ${x.progress.percent}% complete`))}`,
    `XP ${ov.totalXp}, rank ${ov.rankTitle}; streak ${ov.streak.current} days (longest ${ov.streak.longest})`,
    `Strongest skills: ${list(ov.skills.slice(0, 6).map((s) => `${s.name} (${s.tierName})`))}`,
    `Recent missions:\n${recent.join("\n") || "none yet"}`,
    p.challenge ? `On the 30-Day Discovery Challenge (${Object.keys(p.challenge.completed).length}/30 days) exploring ${list(p.challenge.careers)}` : null,
    state.passport.length ? `Passport entries: ${list(state.passport.map((x) => `${x.kind}: ${x.title}`))}` : null,
    `Plan: ${p.plan === "plus" ? "Direction Plus" : "Direction Free"}`,
    `Today: ${today}`,
  ].filter(Boolean);

  if (opts.missionId) {
    const ref = findMission(opts.missionId);
    if (ref) {
      lines.push(
        `\nThe user wants help with this mission (from the ${ref.path.title} path, level ${ref.level.n}):\nTitle: ${ref.mission.title}\nObjective: ${ref.mission.objective}\nSteps: ${ref.mission.steps.join(" / ")}\nCoach them through it; don't just do it for them.`,
      );
    }
  }
  const modes: Record<string, string> = {
    interview: "MODE: Interview practice. Ask one realistic interview question at a time for the user's direction. After each answer give a short score out of 5 for structure, specificity and impact, one strength, one improvement and a stronger example answer, then ask the next question.",
    cv: "MODE: CV review. Ask the user to paste their CV if they haven't. Give prioritised, specific feedback for early-career roles in their direction.",
    outreach: "MODE: Outreach writing. Help write a short, genuine, specific message to someone in the industry. No begging for jobs; one clear, easy ask.",
    plan: "MODE: Development plan. Build a realistic 4-week plan using their available time, current path level and weakest relevant skills. Use weeks and concrete actions.",
    portfolio: "MODE: Portfolio feedback. Ask what they've made and give critique like a kind senior creative or engineer: what works, what's unclear, what to do next.",
    change: "MODE: Changing direction. Help them explore alternatives that reuse their existing skills; reassure them progress transfers.",
  };
  if (opts.mode && modes[opts.mode]) lines.push(`\n${modes[opts.mode]}`);
  return `About the user (live from the app):\n${lines.join("\n")}`;
}
