import "server-only";
import { notFound } from "next/navigation";
import { catalog, isLive } from "@/lib/catalog";
import type { DbState } from "@/lib/db/types";

/** Resolves a live universe (admins may also preview drafts). */
export function liveUniverseOr404(state: DbState, slug: string, at: number, isAdmin = false) {
  const idx = catalog(state);
  const u = idx.bySlug.get(slug);
  if (!u) notFound();
  if (!isLive(idx, u, at) && !isAdmin) notFound();
  return u;
}
