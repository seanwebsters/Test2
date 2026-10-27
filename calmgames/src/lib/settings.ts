import type { AgentId, Settings } from "./types";
import { DEFAULT_MODEL } from "./ai/models";

export function defaultSettings(): Settings {
  const model = process.env.CALM_DEFAULT_MODEL || DEFAULT_MODEL;
  const models = { ideation: model, design: model, art: model, development: model, qa: model, insights: model } satisfies Record<AgentId, string>;
  return { models, effort: "medium", maxRepairs: 2, qaEnabled: true };
}
