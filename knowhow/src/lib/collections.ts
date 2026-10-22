import "server-only";
import type { CollectionRecord } from "./model";
import { EDITORIAL_COLLECTIONS } from "@/content/collections";
import { store } from "./store";

/** Editorial collections are code; their follower counts and user collections live in the store. */
export async function allCollections(): Promise<CollectionRecord[]> {
  const stored = await store.listCollections();
  const byId = new Map(stored.map((c) => [c.id, c]));
  const editorial = EDITORIAL_COLLECTIONS.map((e) => ({ ...e, followers: byId.get(e.id)?.followers ?? e.followers }));
  return [...editorial, ...stored.filter((c) => !c.editorial)];
}

export async function findCollection(id: string): Promise<CollectionRecord | null> {
  return (await allCollections()).find((c) => c.id === id) ?? null;
}
