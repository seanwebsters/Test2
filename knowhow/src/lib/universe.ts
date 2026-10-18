import type { CategoryId, Series, Topic } from "./types";
import { CATEGORIES, TOPICS, TOPIC_BY_ID } from "@/content/categories";

export type NodeState = "lit" | "path" | "discoverable";

export interface UniverseNode {
  id: string;
  label: string;
  category: CategoryId | "self";
  depth: number;
  parent?: string;
  state: NodeState | "category-lit" | "category-dim" | "self";
  /** episodes completed that directly cover this topic */
  count: number;
  /** series that explore this topic (for "discover" actions) */
  series: string[];
}

export interface UniverseEdge {
  from: string;
  to: string;
  kind: "tree" | "related";
  lit: boolean;
}

export interface Universe {
  nodes: UniverseNode[];
  edges: UniverseEdge[];
  litTopics: string[];
  hiddenCount: number;
  categoryCounts: Record<CategoryId, number>;
}

function depthOf(t: Topic): number {
  let d = 1;
  let p = t.parent;
  while (p) {
    d++;
    p = TOPIC_BY_ID[p]?.parent;
  }
  return d;
}

/**
 * Builds a listener's knowledge universe from the episodes they've actually completed.
 * A topic lights up when a completed episode covers it; its ancestors become the lit
 * path to it. Neighbouring topics (children and cross-links) appear as discoverable
 * stars so the graph always points at real series to explore next.
 */
export function buildUniverse(series: Series[], completedEpisodeIds: Iterable<string>, interests: CategoryId[] = []): Universe {
  const completed = new Set(completedEpisodeIds);
  const direct = new Map<string, number>();
  const seriesForTopic = new Map<string, Set<string>>();
  const categoryCounts = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<CategoryId, number>;

  for (const s of series) {
    for (const e of s.episodes) {
      for (const t of e.topics) {
        if (!seriesForTopic.has(t)) seriesForTopic.set(t, new Set());
        if (e.status === "released") seriesForTopic.get(t)!.add(s.slug);
      }
      if (completed.has(e.id)) {
        categoryCounts[s.category]++;
        for (const t of e.topics) direct.set(t, (direct.get(t) ?? 0) + 1);
      }
    }
  }

  const lit = new Set(direct.keys());
  const path = new Set<string>();
  for (const id of lit) {
    let p = TOPIC_BY_ID[id]?.parent;
    while (p) {
      if (!lit.has(p)) path.add(p);
      p = TOPIC_BY_ID[p]?.parent;
    }
  }
  const active = new Set([...lit, ...path]);
  const litCategories = new Set(TOPICS.filter((t) => active.has(t.id)).map((t) => t.category));

  const discoverable = new Set<string>();
  for (const t of TOPICS) {
    if (active.has(t.id)) continue;
    const parentActive = t.parent ? active.has(t.parent) : false;
    const rootOfInterest = !t.parent && (litCategories.has(t.category) || interests.includes(t.category));
    const relatedActive = (t.related ?? []).some((r) => lit.has(r)) || TOPICS.some((o) => lit.has(o.id) && o.related?.includes(t.id));
    if ((parentActive || rootOfInterest || relatedActive) && (seriesForTopic.get(t.id)?.size ?? 0) > 0) discoverable.add(t.id);
  }

  const nodes: UniverseNode[] = [{ id: "self", label: "You", category: "self", depth: 0, state: "self", count: completed.size, series: [] }];
  for (const c of CATEGORIES) {
    nodes.push({ id: `cat:${c.id}`, label: c.label, category: c.id, depth: 0.5, state: litCategories.has(c.id) ? "category-lit" : "category-dim", count: categoryCounts[c.id], series: [] });
  }
  for (const t of TOPICS) {
    const state: NodeState | null = lit.has(t.id) ? "lit" : path.has(t.id) ? "path" : discoverable.has(t.id) ? "discoverable" : null;
    if (!state) continue;
    nodes.push({ id: t.id, label: t.label, category: t.category, depth: depthOf(t), parent: t.parent ?? `cat:${t.category}`, state, count: direct.get(t.id) ?? 0, series: [...(seriesForTopic.get(t.id) ?? [])] });
  }

  const visible = new Set(nodes.map((n) => n.id));
  const edges: UniverseEdge[] = CATEGORIES.map((c) => ({ from: "self", to: `cat:${c.id}`, kind: "tree" as const, lit: litCategories.has(c.id) }));
  for (const n of nodes) {
    if (n.parent && visible.has(n.parent)) {
      edges.push({ from: n.parent, to: n.id, kind: "tree", lit: active.has(n.id) });
    }
  }
  for (const t of TOPICS) {
    for (const r of t.related ?? []) {
      if (visible.has(t.id) && visible.has(r)) edges.push({ from: t.id, to: r, kind: "related", lit: lit.has(t.id) && lit.has(r) });
    }
  }

  return { nodes, edges, litTopics: [...lit], hiddenCount: TOPICS.length - (nodes.length - 1 - CATEGORIES.length), categoryCounts };
}
