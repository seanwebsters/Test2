import "server-only";
import type { Repo } from "./repo";
import { createLocalRepo } from "./local";
import { createSupabaseRepo } from "./supabase";
import { seedStudio } from "../seeds";

const g = globalThis as unknown as { __calmRepo?: Repo; __calmSeeded?: Promise<void> };

export function storageMode(): { kind: "local" | "supabase"; problem?: string } {
  if (process.env.DATA_BACKEND !== "supabase") return { kind: "local" };
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { kind: "supabase", problem: "DATA_BACKEND=supabase but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing" };
  return { kind: "supabase" };
}

/** The studio's store. Seeds the example games the first time it opens. */
export async function repo(): Promise<Repo> {
  if (!g.__calmRepo) {
    const mode = storageMode();
    if (mode.problem) throw new Error(mode.problem);
    g.__calmRepo = mode.kind === "supabase" ? createSupabaseRepo(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) : createLocalRepo();
  }
  g.__calmSeeded ??= seedStudio(g.__calmRepo);
  await g.__calmSeeded;
  return g.__calmRepo;
}
