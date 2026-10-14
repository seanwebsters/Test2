/**
 * Rule-based story checks. These run on every script regardless of which
 * model (if any) is configured, and are combined with model-based review
 * when a writing provider is available.
 */
import type { ContinuityIssue } from "@/lib/types";

const NEGATION = /\b(never|not|no|n't|nor|without|cannot)\b/i;
const STOP = new Set(["the", "a", "an", "of", "over", "in", "on", "at", "to", "and", "is", "are", "fully", "ever", "may", "must", "be", "its", "their", "his", "her", "only", "any", "one", "anyone"]);
const COMMON_CAPS = new Set([
  "The", "A", "An", "And", "But", "She", "He", "They", "It", "I", "You", "We", "There", "Here", "Then", "Now", "Tonight", "Welcome",
  "Take", "Let", "Before", "After", "Somewhere", "Last", "Each", "Every", "Listen", "Just", "Will", "Sleep", "Slowly", "Nothing", "About",
  "All", "As", "When", "With", "This", "That", "Their", "Her", "His", "Your", "My", "Our", "In", "On", "At", "Over", "Under", "For", "So",
  "No", "Yes", "Not", "Once", "Even", "Only", "Perhaps", "Maybe", "Soon", "Still", "Above", "Below", "Beyond", "Outside", "Inside", "Its",
]);

function sentences(text: string): string[] {
  return text.replace(/\n+/g, " ").match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

function stem(word: string): string {
  return word.toLowerCase().replace(/(ing|ed|es|s)$/, "");
}

function contentWords(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Detect script sentences that assert something a "never / no one may" world rule forbids. */
export function checkWorldRules(script: string, rules: string[]): ContinuityIssue[] {
  const issues: ContinuityIssue[] = [];
  const sents = sentences(script);
  for (const rule of rules) {
    const m = /^(.*?)\b(never|no one may|nobody may|must never|cannot|can't)\b(.*)$/i.exec(rule);
    if (!m) continue;
    const subject = contentWords(m[1] ?? "");
    const predicate = contentWords(m[3] ?? "");
    const verb = predicate[0];
    if (!verb) continue;
    const keys = [...subject.slice(-1), ...predicate.slice(1, 2)];
    for (const s of sents) {
      const words = s.toLowerCase().split(/[^a-z']+/).map(stem);
      if (!words.includes(stem(verb))) continue;
      if (keys.length && !keys.some((k) => words.includes(stem(k)))) continue;
      if (NEGATION.test(s)) continue;
      issues.push({ severity: "conflict", message: `May contradict the world rule “${rule}”`, evidence: s });
      break;
    }
  }
  return issues;
}

/** Names that recur in the script but aren't in the Story Bible. */
export function checkUnknownNames(script: string, known: string[]): ContinuityIssue[] {
  const knownTokens = new Set(known.flatMap((k) => k.split(/\s+/)).map((k) => k.replace(/[^A-Za-z']/g, "")));
  const counts = new Map<string, number>();
  for (const s of sentences(script)) {
    const tokens = s.split(/\s+/).slice(1); // skip sentence-initial capitals
    for (const t of tokens) {
      const w = t.replace(/[^A-Za-z']/g, "").replace(/'s$/, "");
      if (w.length < 3 || !/^[A-Z][a-z]/.test(w) || COMMON_CAPS.has(w) || knownTokens.has(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .slice(0, 5)
    .map(([name, n]) => ({
      severity: "info" as const,
      message: `“${name}” appears ${n} times but isn't in the Story Bible. Add them as a character or location to keep future episodes consistent.`,
      evidence: name,
    }));
}

/** Characters marked as no longer present (e.g. "left", "departed") who reappear. */
export function checkFacts(script: string, facts: string[]): ContinuityIssue[] {
  const issues: ContinuityIssue[] = [];
  for (const f of facts) {
    const m = /^([A-Z][a-z]+) (?:has )?(left|departed|moved away|is away)\b/.exec(f);
    if (m && new RegExp(`\\b${m[1]}\\b`).test(script)) {
      issues.push({ severity: "warn", message: `Established fact: “${f}” – but ${m[1]} appears in this script.`, evidence: m[1]! });
    }
  }
  return issues;
}

export interface SleepReport {
  score: number;
  issues: { severity: "pass" | "warn" | "fail"; message: string }[];
  avg_sentence_words: number;
  word_count: number;
}

const STIMULATING = /\b(scream\w*|shout\w*|blood\w*|kill\w*|dead|died|death|terrif\w*|horror|panic\w*|explo\w*|gun\w*|crash\w*|monster\w*|attack\w*|chase\w*|fight\w*|war|weapon\w*|nightmare\w*|suddenly|racing|slammed)\b/gi;
const CALM_END = /\b(sleep|rest|still|quiet|soft|breath|breathe|dream|warm|safe|gentle|slow)\w*/gi;

/** Heuristic sleep-suitability review used by the Sleep Editor agent and the editorial queue. */
export function sleepSuitability(script: string): SleepReport {
  const sents = sentences(script);
  const words = script.split(/\s+/).filter(Boolean).length;
  const avg = sents.length ? words / sents.length : 0;
  const stim = script.match(STIMULATING) ?? [];
  const exclaims = (script.match(/!/g) ?? []).length;
  const paras = script.split(/\n\s*\n/).filter((p) => p.trim());
  const ending = paras.slice(-2).join(" ");
  const calmEnding = (ending.match(CALM_END) ?? []).length;
  const issues: SleepReport["issues"] = [];
  let score = 100;
  if (stim.length) {
    score -= Math.min(40, stim.length * 8);
    issues.push({ severity: stim.length > 3 ? "fail" : "warn", message: `Potentially stimulating language: ${[...new Set(stim.map((s) => s.toLowerCase()))].slice(0, 6).join(", ")}.` });
  } else issues.push({ severity: "pass", message: "No distressing or high-energy language found." });
  if (exclaims > 2) {
    score -= Math.min(15, exclaims * 2);
    issues.push({ severity: "warn", message: `${exclaims} exclamation marks – consider softer punctuation for narration.` });
  }
  if (avg < 9) {
    score -= 15;
    issues.push({ severity: "warn", message: `Short sentences (avg ${avg.toFixed(1)} words) can feel brisk. Longer, flowing sentences help listeners relax.` });
  } else issues.push({ severity: "pass", message: `Flowing sentence rhythm (avg ${avg.toFixed(1)} words).` });
  if (calmEnding < 2) {
    score -= 20;
    issues.push({ severity: "warn", message: "The ending could be more restful – close somewhere warm, quiet and settled." });
  } else issues.push({ severity: "pass", message: "Ends on a restful note." });
  return { score: Math.max(0, score), issues, avg_sentence_words: Number(avg.toFixed(1)), word_count: words };
}
