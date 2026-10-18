import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { overview } from "@/lib/engine/derive";
import { getViewer } from "./auth";
import { loadState, todayFor } from "./services";

/** Per-request cached session + state for server components. */
export const getSession = cache(async () => {
  const viewer = await getViewer();
  if (!viewer) return null;
  const state = await loadState(viewer);
  const today = todayFor(state.profile);
  return { viewer, state, today, overview: overview(state, today) };
});

export async function requireSession(opts: { onboarded?: boolean } = {}) {
  const s = await getSession();
  if (!s) redirect("/welcome");
  if (opts.onboarded !== false && !s.state.profile.onboarding) redirect("/onboarding");
  return s;
}
