import "server-only";
import { CAREERS, getCareer, ROUTE_LABELS } from "@/lib/content/careers";
import { findMission } from "@/lib/content/paths";
import { skillName } from "@/lib/content/skills";
import { overview } from "@/lib/engine/derive";
import type { UserState } from "@/lib/engine/model";
import type { ChatProvider, ChatRequest } from "./provider";

const INTERVIEW_QUESTIONS = [
  "Tell me about yourself and why you're interested in this field.",
  "Describe a project you're proud of. What was your role, and what would you do differently?",
  "Tell me about a time something went wrong. What did you do?",
  "Why this organisation, rather than any other?",
  "What's something you've taught yourself recently, and how did you go about it?",
];

/**
 * A deterministic, rule-based coach used when no AI key is configured or the
 * AI service is unavailable. It uses the same user model, gives genuinely
 * useful structured guidance and is clearly labelled as offline in the UI.
 */
export function offlineReply(state: UserState, today: string, message: string, opts: { mode?: string; missionId?: string | null; history?: { role: string; content: string }[] } = {}): string {
  const text = message.toLowerCase();
  const name = state.profile.displayName.split(" ")[0] || "there";
  const ov = overview(state, today);
  const primary = ov.primary;
  const career = primary ? getCareer(primary.careerSlug) : state.profile.matches[0] ? getCareer(state.profile.matches[0].careerSlug) : undefined;
  const title = career?.title ?? "your chosen direction";

  if (/suicid|kill myself|self.?harm|end it all|hopeless/.test(text)) {
    return `I'm really sorry you're feeling like this, ${name}. You don't have to deal with it on your own. Please talk to someone you trust today. If you're in the UK you can call Samaritans any time on 116 123 (free), or text SHOUT to 85258. If you're in danger right now, call 999 or your local emergency number.\n\nCareer stuff can wait — you matter more. I'm here whenever you want to talk.`;
  }

  if (opts.missionId) {
    const ref = findMission(opts.missionId);
    if (ref) {
      const m = ref.mission;
      return [
        `Let's tackle **${m.title}** together.`,
        `**The goal:** ${m.objective}`,
        `**How I'd approach it:**`,
        ...m.steps.map((s, i) => `${i + 1}. ${s}`),
        `\n**Tip:** set a ${m.minutes}-minute timer and aim for "done", not perfect. ${m.evidence !== "none" ? "When you finish, jot down what you did — that becomes evidence in your Passport." : ""}`,
        `Which step feels hardest? Tell me and I'll help you break it down.`,
      ].join("\n");
    }
  }

  const mode = opts.mode ?? "";
  if (mode === "interview" || /interview|mock/.test(text)) {
    const asked = (opts.history ?? []).filter((h) => h.role === "assistant" && h.content.includes("**Question")).length;
    const q = INTERVIEW_QUESTIONS[asked % INTERVIEW_QUESTIONS.length]!;
    const feedback =
      asked > 0
        ? `Thanks for that answer. Quick feedback:\n- **Structure:** try Situation → Task → Action → Result.\n- **Specifics:** add one number or concrete detail (how many, how long, what changed).\n- **Impact:** finish with what you learned or what happened because of you.\n\n`
        : `Let's practise for ${title} roles. Answer as if it's the real thing — I'll give feedback after each one.\n\n`;
    return `${feedback}**Question ${asked + 1}:** ${q}`;
  }

  if (mode === "cv" || /\bcv\b|resume|résumé/.test(text)) {
    return [
      `Happy to help with your CV for ${title} roles. Here's what early-career CVs that get interviews usually do:`,
      `1. **One page**, with a link to your portfolio or projects right at the top.`,
      `2. **A two-line profile** saying what you're aiming for and what you bring.`,
      `3. **Projects before duties.** For each: what you did, how, and the result.`,
      `4. **Skills that match the job advert** — ${career ? career.skills.slice(0, 3).map(skillName).join(", ") : "pick the top three from the advert"}.`,
      `5. **Evidence over adjectives.** "Grew a club's Instagram from 200 to 900 followers" beats "great at social media".`,
      `\nPaste your CV here and I'll go through it section by section.`,
    ].join("\n");
  }

  if (mode === "outreach" || /message|reach out|email someone|linkedin|network/.test(text)) {
    return [
      `Here's a short outreach template you can adapt:`,
      `\n> Hi [Name], I came across your work on [specific project] and loved [one specific detail]. I'm exploring a career as ${/^[aeiou]/i.test(title) ? "an" : "a"} ${title} and I'm curious — what's one thing you wish you'd known when you started? No worries at all if you're busy. Thanks, ${name}`,
      `\n**Why it works:** it's specific, it's about them, and the ask takes 30 seconds to answer.`,
      `Who are you thinking of contacting? Tell me a bit about them and I'll help you personalise it.`,
    ].join("\n");
  }

  if (mode === "plan" || /plan|roadmap|what should i do|next step/.test(text)) {
    const next = primary?.nextMissionId ? findMission(primary.nextMissionId)?.mission.title : null;
    const weak = career?.skills.find((s) => !ov.skills.some((x) => x.id === s && x.tier >= 2));
    const minutes = state.profile.onboarding?.minutesPerDay ?? 15;
    return [
      `Here's a realistic 4-week plan for ${title}, using about ${minutes} minutes a day:`,
      `**Week 1 — Momentum.** ${next ? `Start with "${next}". ` : ""}Do your daily missions every day, even the small ones.`,
      `**Week 2 — Skill focus.** Put extra time into ${weak ? skillName(weak).toLowerCase() : "your weakest core skill"}. One practice session every other day.`,
      `**Week 3 — Make something.** Pick a small project you can finish and show someone.`,
      `**Week 4 — Get out there.** Send one friendly message to someone in the industry and save two opportunities.`,
      `\nWant me to adjust this for exams, a job, or more or less time?`,
    ].join("\n");
  }

  if (/change|switch|don't like|dont like|hate|not for me|wrong career/.test(text)) {
    const top = ov.skills.slice(0, 3).map((s) => s.name.toLowerCase());
    const alt = state.profile.matches.filter((m) => m.careerSlug !== primary?.careerSlug).slice(0, 3).map((m) => getCareer(m.careerSlug)?.title).filter(Boolean);
    return [
      `That's a really useful thing to discover, ${name} — and nothing you've done is wasted.`,
      top.length ? `The skills you've built (${top.join(", ")}) transfer to lots of careers.` : "Every mission you've done builds transferable skills.",
      alt.length ? `Based on your answers, you might enjoy exploring **${alt.join("**, **")}**.` : "",
      `You can pause your current path any time from My Path (progress is saved) and start another, or try the 30-Day Discovery Challenge to sample a few.`,
      `What specifically hasn't felt right — the work itself, the people, or the lifestyle?`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (/salary|pay|earn|money/.test(text) && career) {
    const s = career.salary;
    return `Indicative UK pay for ${career.title}s is roughly £${s.entry}k at entry level, £${s.mid}k mid-career and £${s.senior}k+ for senior roles${s.variable ? " — though income here is often freelance and varies a lot" : ""}. London is usually higher. These are rough guides, so check the National Careers Service or real job adverts for current figures. Want tips on how people in this field increase their earnings?`;
  }

  const mentioned = CAREERS.find((c) => text.includes(c.title.toLowerCase()));
  if (mentioned) {
    return [
      `**${mentioned.title}** — ${mentioned.tagline}`,
      mentioned.summary,
      `**Key skills:** ${mentioned.skills.map(skillName).join(", ")}.`,
      `**Ways in:** ${mentioned.routes.map((r) => ROUTE_LABELS[r].name.toLowerCase()).join(", ")}.`,
      `You can explore the full profile in Discover and try level 1 missions without committing. What draws you to it?`,
    ].join("\n\n");
  }

  if (/stuck|unmotivated|can't|cant|tired|overwhelm|scared|nervous/.test(text)) {
    return `That's completely normal, ${name}. Career stuff feels huge because it is — so let's make it small. Pick the shortest mission on your list today and give it just 10 minutes. Momentum beats motivation. ${ov.streak.longest > 1 ? `You've already managed a ${ov.streak.longest}-day streak before, so you know you can do this.` : ""}\n\nWhat's the one thing making it feel hard right now?`;
  }

  if (/^(hi|hey|hello|yo|hiya)\b/.test(text) || text.length < 4) {
    return `Hey ${name}! 👋 I'm Pip, your career coach. ${primary ? `You're on level ${primary.progress.currentLevel} of your ${primary.title} path — nice.` : "Let's figure out your direction together."}\n\nI can help you with a mission, practise interviews, review your CV, write an outreach message, or make a plan. What would be most useful today?`;
  }

  return [
    `Good question, ${name}. Here's how I'd think about it for ${title}:`,
    `- **Start small:** one concrete action today beats a perfect plan.`,
    `- **Get evidence:** projects and real experience matter more than anything you can say about yourself.`,
    `- **Talk to people:** one conversation with someone in the field can save you months.`,
    `\nTell me a bit more about what you're trying to do and I'll get specific. I can also run interview practice, review your CV or help with a mission.`,
  ].join("\n");
}

export function offlineProvider(state: UserState, today: string, opts: { mode?: string; missionId?: string | null }): ChatProvider {
  return {
    name: "offline",
    async *stream(req: ChatRequest) {
      const last = req.messages[req.messages.length - 1]?.content ?? "";
      const reply = offlineReply(state, today, last, { ...opts, history: req.messages });
      for (const chunk of reply.match(/\S+\s*/g) ?? [reply]) yield chunk;
    },
  };
}
