"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { EpisodeMeta, Series } from "@/lib/types";

interface CatalogCtx {
  series: Series[];
  bySlug: Record<string, Series>;
  byEpisode: Record<string, EpisodeMeta>;
}
const Ctx = createContext<CatalogCtx | null>(null);

export function CatalogProvider({ series, children }: { series: Series[]; children: ReactNode }) {
  const value = useMemo(
    () => ({
      series,
      bySlug: Object.fromEntries(series.map((s) => [s.slug, s])),
      byEpisode: Object.fromEntries(series.flatMap((s) => s.episodes.map((e) => [e.id, e]))),
    }),
    [series],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCatalog outside provider");
  return c;
}
