import "server-only";
import { catalog } from "@/lib/catalog";
import { now } from "@/lib/clock";
import { getStore } from "@/lib/db";
import { loadViewer } from "./viewer";

/** Common data for server pages. */
export async function pageCtx() {
  const { user } = await loadViewer();
  const state = getStore().read();
  const at = now();
  return { state, user, at, idx: catalog(state) };
}
