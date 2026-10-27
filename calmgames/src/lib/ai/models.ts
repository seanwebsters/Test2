/** Models the studio can route agents to, with list prices per million tokens (USD). */
export const MODELS = [
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", input: 4, output: 20, note: "Default. Strongest creative and code quality." },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", input: 2, output: 10, note: "Faster and about half the cost." },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", input: 0.1, output: 0.5, note: "Cheapest; best for light review work." },
] as const;

export const DEFAULT_MODEL = "claude-opus-5-5";

export function priceFor(model: string) {
  return MODELS.find((m) => m.id === model) ?? MODELS[0];
}

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = priceFor(model);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

/**
 * Typical token use per agent, measured as rough budgets for an estimate
 * shown before a run. Actual usage is recorded from every API response.
 */
export const TYPICAL_TOKENS: Record<string, { input: number; output: number }> = {
  ideation: { input: 2500, output: 2500 },
  design: { input: 3500, output: 3000 },
  art: { input: 4000, output: 5000 },
  development: { input: 7000, output: 7000 },
  repair: { input: 9000, output: 6000 },
  insights: { input: 6000, output: 2500 },
};
