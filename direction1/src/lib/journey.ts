import { careersInWorld } from '../data/careers';
import { EPISODES } from '../data/episodes';
import { SIMS } from '../sims';
import type { World, WorldId } from '../data/types';

export type NodeKind = 'lesson' | 'sim' | 'story' | 'chest' | 'landmark';
export interface PathNode { id: string; kind: NodeKind; world: WorldId; ref: string; label: string }

export function nodesForWorld(w: World, recOrder: string[]): PathNode[] {
  const careers = careersInWorld(w.id).sort((a, b) => recOrder.indexOf(a.id) - recOrder.indexOf(b.id));
  const sim = SIMS.find((s) => s.world === w.id);
  const ep = EPISODES.find((e) => e.world === w.id);
  const nodes: PathNode[] = [];
  const n = (kind: NodeKind, ref: string, label: string) => nodes.push({ id: `${w.id}:${nodes.length}`, kind, world: w.id, ref, label });
  if (careers[0]) n('lesson', careers[0].id, careers[0].title);
  if (careers[1]) n('lesson', careers[1].id, careers[1].title);
  if (sim) n('sim', sim.id, sim.role);
  n('chest', 'chest', 'Reward chest');
  if (ep) n('story', ep.id, 'Day in the Life');
  else if (careers[2]) n('lesson', careers[2].id, careers[2].title);
  if (careers[2] && ep) n('lesson', careers[2].id, careers[2].title);
  n('landmark', w.id, `${w.short} landmark`);
  return nodes;
}

export interface DoneState { activities: { kind: string; ref: string }[]; claimedNodes: string[]; episodeProg: Record<string, number> }

export function isDone(node: PathNode, s: DoneState) {
  switch (node.kind) {
    case 'lesson': return s.activities.some((a) => a.kind === 'lesson' && a.ref === node.ref);
    case 'sim': return s.activities.some((a) => a.kind === 'sim' && a.ref === node.ref);
    case 'story': return (s.episodeProg[node.ref] ?? 0) >= 0.99 || s.activities.some((a) => a.kind === 'episode' && a.ref === node.ref);
    default: return s.claimedNodes.includes(node.id);
  }
}
