import "server-only";
import { z } from "zod";
import type { Career } from "@/lib/content/types";
import { skillName } from "@/lib/content/skills";
import { aiConfigured } from "../env";
import { generateJson } from "./provider";

export const InsightSchema = z.object({
  realityCheck: z.string(),
  typicalWeek: z.array(z.string()).max(6),
  misconceptions: z.array(z.string()).max(4),
  questionsToAsk: z.array(z.string()).max(5),
  firstSteps: z.array(z.string()).max(5),
});
export type CareerInsight = z.infer<typeof InsightSchema> & { source: "ai" | "editorial"; note: string };

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["realityCheck", "typicalWeek", "misconceptions", "questionsToAsk", "firstSteps"],
  properties: {
    realityCheck: { type: "string", description: "2–3 honest sentences on what the job is really like." },
    typicalWeek: { type: "array", items: { type: "string" }, description: "4–6 short bullets describing a typical week." },
    misconceptions: { type: "array", items: { type: "string" }, description: "2–4 common myths, each corrected." },
    questionsToAsk: { type: "array", items: { type: "string" }, description: "3–5 questions to ask someone in the job." },
    firstSteps: { type: "array", items: { type: "string" }, description: "3–5 free or low-cost first steps a beginner could take this month." },
  },
};

const SYSTEM = `You write short, honest career explainers for 16–25 year olds. British English. Warm, specific and practical.
Strict safeguards: do NOT state salaries, pay figures, percentages or statistics; do NOT state specific qualification requirements, entry grades or course names; do NOT name specific job openings, events, deadlines or programmes. Describe the work itself. If unsure, be general rather than inventing detail.`;

/** Removes anything that looks like an invented figure, as a second line of defence. */
export function scrubUnverified(s: string): string {
  return s
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/[£$€]\s?\d|\d+\s?(k|%|percent|per cent)\b|\bUCAS points\b|\bA\*|\bgrade [A-E9]\b/i.test(sentence))
    .join(" ")
    .trim();
}

const cache = new Map<string, CareerInsight>();

export function editorialInsight(c: Career): CareerInsight {
  return {
    source: "editorial",
    note: "Written from Direction's career profile.",
    realityCheck: `${c.summary} ${c.challenges[0] ?? ""}`.trim(),
    typicalWeek: c.dayInLife.map((d) => `${d.title}: ${d.detail}`),
    misconceptions: [
      `You don't need to have it all figured out at the start — most ${c.title}s took a winding route.`,
      `It's not all ${c.dayInLife[2]?.title.toLowerCase() ?? "the exciting part"}: a lot of the job is communication and steady practice.`,
    ],
    questionsToAsk: [
      "What does a normal week actually look like for you?",
      "What do you wish you'd known when you started?",
      `Which skills matter most — is it really ${skillName(c.skills[0] ?? "communication").toLowerCase()}?`,
      "How did you get your first role?",
    ],
    firstSteps: [`Do level 1 of the ${c.title} path in Direction.`, "Find one person in the job online and read about their journey.", "Make one tiny thing a beginner in this field would make."],
  };
}

/**
 * AI-generated deeper look at a career, with safeguards against invented
 * salaries, qualifications and openings. Falls back to editorial content.
 */
export async function careerInsight(c: Career): Promise<CareerInsight> {
  const hit = cache.get(c.slug);
  if (hit) return hit;
  if (!aiConfigured()) return editorialInsight(c);
  try {
    const raw = await generateJson(
      SYSTEM,
      `Career: ${c.title}\nCategory: ${c.category}\nSummary: ${c.summary}\nKey skills: ${c.skills.map(skillName).join(", ")}\nWrite the explainer.`,
      JSON_SCHEMA,
    );
    const parsed = InsightSchema.parse(raw);
    const clean: CareerInsight = {
      source: "ai",
      note: "AI-generated with safeguards: no salaries, qualifications or vacancies. Always check official sources.",
      realityCheck: scrubUnverified(parsed.realityCheck),
      typicalWeek: parsed.typicalWeek.map(scrubUnverified).filter(Boolean),
      misconceptions: parsed.misconceptions.map(scrubUnverified).filter(Boolean),
      questionsToAsk: parsed.questionsToAsk.map(scrubUnverified).filter(Boolean),
      firstSteps: parsed.firstSteps.map(scrubUnverified).filter(Boolean),
    };
    cache.set(c.slug, clean);
    return clean;
  } catch (e) {
    console.error("[direction] insight generation failed", e);
    return editorialInsight(c);
  }
}
