import { costUsd, TYPICAL_TOKENS } from "./ai/models";
import type { Settings } from "./types";

/** Pre-run estimate from typical token budgets; actual cost is recorded per call. */
export function estimateJob(settings: Settings, kind: "generate" | "refine" | "lab") {
  const parts: { agent: string; usd: number }[] = [];
  const add = (agent: keyof Settings["models"], budget: keyof typeof TYPICAL_TOKENS, times = 1) => {
    const t = TYPICAL_TOKENS[budget];
    parts.push({ agent, usd: costUsd(settings.models[agent], t.input * times, t.output * times) });
  };
  if (kind === "lab") {
    add("ideation", "ideation", 2);
    add("design", "design", 1.5);
  } else {
    add("ideation", "ideation");
    add("design", "design");
    add("art", "art");
    add("development", "development");
    add("insights", "insights");
  }
  const base = parts.reduce((a, p) => a + p.usd, 0);
  const t = TYPICAL_TOKENS.repair;
  const repairWorst = kind === "lab" ? 0 : settings.maxRepairs * costUsd(settings.models.development, t.input, t.output);
  return { typicalUsd: base, worstCaseUsd: base * 1.6 + repairWorst, parts };
}
