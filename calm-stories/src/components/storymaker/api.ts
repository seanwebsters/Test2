"use client";

import type { ConversationMessage } from "@/lib/types";
import type { Workspace } from "@/lib/storymaker/workspace";

export type { Workspace };
export type WsEpisode = Workspace["episodes"][number];

export type ToolOutcome =
  | { status: "executed"; tool: string; tool_call_id: string; result: { summary: string; series_id?: string; focus?: { section: string; id?: string }; data?: unknown; cards?: ConversationMessage["cards"]; meta?: { simulated: boolean } } }
  | { status: "pending_confirmation"; tool: string; tool_call_id: string; reason: string; summary: string };

export class ApiError extends Error {}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string; issues?: string[] };
  if (!res.ok) throw new ApiError(body.error ? `${body.error}${body.issues ? ` (${body.issues.join("; ")})` : ""}` : `Request failed (${res.status})`);
  return body;
}

export function runTool(tool: string, input: unknown, seriesId: string | null, confirmed = true) {
  return api<ToolOutcome>("/api/storymaker/tools", { method: "POST", body: JSON.stringify({ tool, input, series_id: seriesId, confirmed }) });
}
