import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CATEGORIES } from "@/content/categories";
import type { Motif } from "@/lib/types";
import { AI_MODEL } from "./providers";

const MOTIFS: Motif[] = ["sun", "columns", "orbit", "blob", "grid", "glyph", "waves", "checker", "rays", "stack", "eye", "spiral", "bars", "halftone"];

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic());

// ── Schemas (validated again with zod after the API's structured output)
const str = { type: "string" } as const;
const strArr = { type: "array", items: str } as const;
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });

const PLAN_SCHEMA = obj({
  interpretedTopic: str,
  difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
  difficultyReason: str,
  category: { type: "string", enum: CATEGORIES.map((c) => c.id) },
  title: str,
  tagline: str,
  description: str,
  motif: { type: "string", enum: MOTIFS },
  curriculum: { type: "array", items: obj({ title: str, description: str, keyIdeas: strArr }) },
  followUps: strArr,
});

const Plan = z.object({
  interpretedTopic: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  difficultyReason: z.string(),
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]]),
  title: z.string().min(2).max(80),
  tagline: z.string().max(140),
  description: z.string().max(600),
  motif: z.enum(MOTIFS as [Motif, ...Motif[]]),
  curriculum: z.array(z.object({ title: z.string(), description: z.string(), keyIdeas: z.array(z.string()) })).min(2).max(6),
  followUps: z.array(z.string()).max(5),
});
export type SeriesPlan = z.infer<typeof Plan>;

const SCRIPT_SCHEMA = obj({
  hook: str,
  story: strArr,
  facts: strArr,
  insight: str,
  outro: str,
  insights: strArr,
  challenge: obj({ question: str, options: strArr, answer: { type: "integer" }, explain: str }),
});

const Script = z.object({
  hook: z.string().min(10),
  story: z.array(z.string()).min(1).max(6),
  facts: z.array(z.string()).max(4),
  insight: z.string(),
  outro: z.string(),
  insights: z.array(z.string()).min(1).max(4),
  challenge: z.object({ question: z.string(), options: z.array(z.string()).min(2).max(5), answer: z.number().int().min(0), explain: z.string() }),
});
export type GeneratedScript = z.infer<typeof Script>;

const SYSTEM = `You write for KNOWHOW, an entertainment app where people binge short, episodic audio series that make them smarter.
Voice: warm, vivid, conversational, story-first, for curious 16–30 year olds. Written for the ear: short sentences, no lists, no markdown, no emojis, numbers written as words where it helps narration.
Accuracy is non-negotiable: only state facts you are confident are well established. Hedge contested claims ("historians estimate", "one theory is"). Never invent quotes, statistics, studies or names. Correct popular myths where relevant.
No artificial cliffhangers: end each episode on a satisfying note that naturally points to the next idea.
Financial, medical or legal topics are educational only: say so briefly where relevant and never give personal advice.`;

async function structured<T>(schema: object, validator: z.ZodType<T>, prompt: string, maxTokens: number): Promise<{ data: T; model: string }> {
  const res = await anthropic().beta.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
    output_config: { effort: "medium", format: { type: "json_schema", schema: schema as Record<string, unknown> } },
    // Server-side fallback if the model declines for policy reasons.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined this topic. Try rephrasing it.");
  if (res.stop_reason === "max_tokens") throw new Error("The response was cut off. Please try again.");
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("The model returned malformed JSON.");
  }
  return { data: validator.parse(json), model: res.model };
}

/** Steps 1–4 and 6: interpret the topic, pick a difficulty, write a curriculum, split it into titled episodes. */
export async function planSeries(prompt: string, episodeCount: number) {
  return structured(
    PLAN_SCHEMA,
    Plan,
    `A listener typed: "${prompt.replace(/"/g, "'")}"

1. Interpret what they actually want to understand (interpretedTopic).
2. Choose a difficulty from their wording and explain why in one sentence.
3. Design a curriculum of exactly ${episodeCount} episodes that build on each other — each with a punchy, intriguing episode title (not a textbook heading), a one-sentence description, and 2–4 key ideas.
4. Give the series a memorable title (max 6 words), a tagline and a two-sentence description.
5. Pick the closest category and a cover motif.
6. Suggest three follow-up topics the listener might want next, phrased as prompts.`,
    6000,
  );
}

/** Step 5: write one episode as a structured script. */
export async function writeEpisode(plan: SeriesPlan, index: number) {
  const ep = plan.curriculum[index];
  const next = plan.curriculum[index + 1];
  return structured(
    SCRIPT_SCHEMA,
    Script,
    `Series: "${plan.title}" — ${plan.description}
Difficulty: ${plan.difficulty}.
Write episode ${index + 1} of ${plan.curriculum.length}: "${ep.title}" — ${ep.description}
Key ideas: ${ep.keyIdeas.join("; ")}.
${next ? `The next episode is "${next.title}".` : "This is the final episode."}

Structure (about 450–600 words of narration in total):
- hook: one or two sentences that make someone need to keep listening, grounded in a real fact or story.
- story: 2–4 paragraphs explaining the idea through a story or concrete example.
- facts: 1–2 short, surprising, accurate facts.
- insight: the memorable takeaway, in two or three sentences.
- outro: one or two sentences that end naturally${next ? " and point to the next episode" : " and wrap up the series"}.
- insights: 2–3 one-line facts or takeaways from this episode worth saving.
- challenge: one multiple-choice recall question with 4 options, the index of the correct option, and a friendly explanation that helps someone who got it wrong.`,
    8000,
  );
}
