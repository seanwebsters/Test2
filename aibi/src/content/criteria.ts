import type { Criterion } from "./types";

// Reusable rubric checks. Lessons combine these with task-specific checks.
export const C = {
  detail: (n = 18): Criterion => ({
    id: "detail",
    label: "Enough detail",
    tip: `Give the AI more to work with — aim for at least ${n} words.`,
    minWords: n,
  }),
  context: (): Criterion => ({
    id: "context",
    label: "Context",
    tip: "Say who it's for or what the situation is (e.g. 'I'm a nurse…', 'for my team…').",
    any: ["\\bI'?m\\b", "\\bI am\\b", "\\bmy\\b", "\\bwe\\b", "\\bour\\b", "\\bfor (a|an|my|the|our)\\b", "because", "audience", "\\bwho\\b"],
  }),
  constraints: (): Criterion => ({
    id: "constraints",
    label: "Constraints",
    tip: "Add limits — a budget, a word count, a deadline or things to avoid.",
    any: ["under", "less than", "no more than", "max", "within", "budget", "£\\s?\\d", "\\$\\s?\\d", "\\d+\\s?(words|minutes|mins|hours|days|items|bullet|sentences|lines)", "avoid", "don'?t", "without", "only", "at most", "limit"],
  }),
  format: (): Criterion => ({
    id: "format",
    label: "Output format",
    tip: "Tell the AI how to lay out the answer — a table, bullet points, a day-by-day plan…",
    any: ["table", "bullet", "list", "step", "day[- ]by[- ]day", "itinerary", "format", "heading", "numbered", "paragraph", "schedule", "columns?", "summary", "outline", "json", "email", "subject line"],
  }),
  tone: (): Criterion => ({
    id: "tone",
    label: "Tone",
    tip: "Say how it should sound — friendly, formal, warm, concise, playful…",
    any: ["tone", "friendly", "formal", "polite", "warm", "casual", "professional", "playful", "concise", "kind", "firm", "upbeat", "calm", "funny", "simple language", "plain english"],
  }),
  role: (): Criterion => ({
    id: "role",
    label: "Role",
    tip: "Give the AI a role, e.g. 'Act as an experienced travel planner'.",
    any: ["act as", "you are", "as an? ", "pretend", "imagine you", "role"],
  }),
  ask: (): Criterion => ({
    id: "ask",
    label: "Invites questions",
    tip: "Invite the AI to ask you questions first if anything's unclear.",
    any: ["ask me", "questions", "clarify", "check with me", "anything (unclear|missing)"],
  }),
  has: (id: string, label: string, tip: string, any: string[]): Criterion => ({ id, label, tip, any }),
};
