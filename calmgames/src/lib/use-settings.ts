"use client";
import { useData } from "./use-data";
import type { Settings } from "./types";
import type { ProviderStatus } from "./providers";

export interface SettingsResponse {
  settings: Settings;
  models: { id: string; name: string; input: number; output: number; note: string }[];
  estimate: { generate: { typicalUsd: number; worstCaseUsd: number; parts: { agent: string; usd: number }[] }; lab: { typicalUsd: number } };
  providers: ProviderStatus[];
  status: { anthropic: boolean; storage: { kind: string; problem?: string }; costCapUsd: number; rateLimitPerMinute: number };
}
export const useSettings = () => useData<SettingsResponse>("/api/settings");
