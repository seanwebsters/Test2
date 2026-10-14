import "server-only";
import type { ZodType, ZodTypeDef } from "zod";
import type { Viewer } from "@/lib/auth/policy";
import { canCreate, canEditSeries, isAdmin } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { forbidden, notFound } from "@/lib/errors";
import type { AssistantCard, GenerationMeta, Series } from "@/lib/types";

export type PreviewSection =
  | "overview"
  | "world"
  | "characters"
  | "relationships"
  | "seasons"
  | "episodes"
  | "script"
  | "audio"
  | "artwork"
  | "publishing";

export interface ToolContext {
  viewer: Viewer & { user: NonNullable<Viewer["user"]> };
  seriesId: string | null;
  conversationId: string | null;
  /** True when the creator explicitly triggered this action (button / confirmation). */
  confirmed: boolean;
}

export interface ToolResult {
  summary: string;
  data?: unknown;
  cards?: AssistantCard[];
  focus?: { section: PreviewSection; id?: string };
  series_id?: string;
  meta?: GenerationMeta;
}

export interface ToolDef<I> {
  name: string;
  description: string;
  input: ZodType<I, ZodTypeDef, unknown>;
  permission: "creator" | "admin";
  /** Whether the tool acts on the current series (ownership is verified). */
  seriesScoped: boolean;
  /**
   * Returns a human-readable reason when the call must be confirmed by the
   * creator first (destructive change, paid generation, public publishing,
   * or overwriting their own words).
   */
  confirm?: (input: I, ctx: ToolContext) => Promise<string | null> | string | null;
  run: (input: I, ctx: ToolContext & { series: Series | null }) => Promise<ToolResult>;
}

const registry = new Map<string, ToolDef<unknown>>();

export function defineTool<I>(def: ToolDef<I>): ToolDef<I> {
  registry.set(def.name, def as ToolDef<unknown>);
  return def;
}

export function getTool(name: string): ToolDef<unknown> | undefined {
  return registry.get(name);
}

export function allTools(): ToolDef<unknown>[] {
  return [...registry.values()];
}

export async function authorizeTool(def: ToolDef<unknown>, ctx: ToolContext): Promise<Series | null> {
  if (def.permission === "admin" && !isAdmin(ctx.viewer)) throw forbidden("This action needs administrator access.");
  if (!canCreate(ctx.viewer)) throw forbidden("Storymaker actions are available to creator accounts.");
  if (!def.seriesScoped) return null;
  if (!ctx.seriesId) throw notFound("Open or create a series first.");
  const series = await getDb().get("series", ctx.seriesId);
  if (!series) throw notFound("Series not found.");
  if (!canEditSeries(ctx.viewer, series)) throw forbidden("You can only edit your own series.");
  return series;
}
