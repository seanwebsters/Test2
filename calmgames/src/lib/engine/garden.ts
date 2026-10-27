import type { GardenLevel } from "./schemas";

export type Ground = "soil" | "water" | "stone" | "channel";
export interface Plant {
  species: string;
  stage: number;
}
export interface GardenState {
  cols: number;
  rows: number;
  ground: Ground[];
  plants: (Plant | null)[];
  /** Tick number up to which a hand-watered cell stays moist. */
  moistUntil: number[];
  tick: number;
  channelsLeft: number;
  stages: number;
}
export type Tool = { kind: "plant"; species: string } | { kind: "water" } | { kind: "channel" };

/** Hand watering keeps soil moist for this many growth ticks. */
export const WATER_TICKS = 2;

const GROUND: Record<string, Ground> = { ".": "soil", "~": "water", "#": "stone" };

export function validateGardenLevel(level: GardenLevel): string[] {
  const errors: string[] = [];
  const width = level.layout[0]?.length ?? 0;
  if (width < 3 || width > 9) errors.push(`layout rows must be 3–9 characters wide (got ${width})`);
  level.layout.forEach((row, i) => {
    if (row.length !== width) errors.push(`layout row ${i} has ${row.length} characters; expected ${width}`);
    for (const ch of row) if (!(ch in GROUND)) errors.push(`layout row ${i} uses '${ch}'; only '.', '~' and '#' are allowed`);
  });
  const all = level.layout.join("");
  if (!all.includes("~")) errors.push("layout needs at least one '~' spring");
  const soil = [...all].filter((c) => c === ".").length;
  if (soil < level.goalBlooms + 2) errors.push(`goalBlooms ${level.goalBlooms} needs at least ${level.goalBlooms + 2} soil cells (has ${soil})`);
  const ids = new Set(level.species.map((s) => s.id));
  if (ids.size !== level.species.length) errors.push("species ids must be unique");
  level.companions.forEach(([a, b], i) => {
    if (!ids.has(a) || !ids.has(b)) errors.push(`companions[${i}] references an unknown species`);
    if (a === b) errors.push(`companions[${i}] pairs a species with itself`);
  });
  if (level.goalHarmonies > 0 && level.companions.length === 0) errors.push("goalHarmonies > 0 needs at least one companion pair");
  if (level.goalHarmonies * 2 > level.goalBlooms) errors.push("goalHarmonies needs two blooms per pair; raise goalBlooms or lower goalHarmonies");
  if (!errors.length && !planGarden(level)) errors.push("no arrangement of soil cells can meet the bloom and harmony goals");
  return errors;
}

export function createGarden(level: GardenLevel): GardenState {
  const rows = level.layout.length, cols = level.layout[0].length;
  const ground = level.layout.join("").split("").map((ch) => GROUND[ch] ?? "stone");
  return {
    cols,
    rows,
    ground,
    plants: ground.map(() => null),
    moistUntil: ground.map(() => -1),
    tick: 0,
    channelsLeft: level.channelBudget,
    stages: level.growthStages,
  };
}

export function neighbours(s: { cols: number; rows: number }, i: number): number[] {
  const c = i % s.cols, r = Math.floor(i / s.cols);
  const out: number[] = [];
  if (r > 0) out.push(i - s.cols);
  if (c < s.cols - 1) out.push(i + 1);
  if (r < s.rows - 1) out.push(i + s.cols);
  if (c > 0) out.push(i - 1);
  return out;
}

/** Channels joined to a spring, directly or through other channels. */
export function flowingChannels(s: GardenState): Set<number> {
  const flowing = new Set<number>();
  const queue = s.ground.flatMap((g, i) => (g === "water" ? [i] : []));
  const seen = new Set(queue);
  while (queue.length) {
    const i = queue.shift()!;
    for (const j of neighbours(s, i)) {
      if (seen.has(j) || s.ground[j] !== "channel") continue;
      seen.add(j);
      flowing.add(j);
      queue.push(j);
    }
  }
  return flowing;
}

/** Soil that sits beside a spring or a flowing channel stays moist on its own. */
export function naturallyMoist(s: GardenState): Set<number> {
  const flowing = flowingChannels(s);
  const moist = new Set<number>();
  s.ground.forEach((g, i) => {
    if (g !== "soil") return;
    if (neighbours(s, i).some((j) => s.ground[j] === "water" || flowing.has(j))) moist.add(i);
  });
  return moist;
}

export const isMoist = (s: GardenState, i: number, natural = naturallyMoist(s)) => natural.has(i) || s.moistUntil[i] >= s.tick + 1;

export function applyTool(s: GardenState, i: number, tool: Tool): { state: GardenState; changed: boolean; effect: string } {
  const g = s.ground[i];
  if (g === undefined) return { state: s, changed: false, effect: "none" };
  if (tool.kind === "plant") {
    if (g !== "soil" || s.plants[i]) return { state: s, changed: false, effect: "occupied" };
    const plants = s.plants.slice();
    plants[i] = { species: tool.species, stage: 0 };
    return { state: { ...s, plants }, changed: true, effect: "planted" };
  }
  if (tool.kind === "water") {
    if (g !== "soil") return { state: s, changed: false, effect: "none" };
    const moistUntil = s.moistUntil.slice();
    moistUntil[i] = s.tick + WATER_TICKS;
    return { state: { ...s, moistUntil }, changed: true, effect: "watered" };
  }
  // Channel tool: dig on empty soil, or fill a channel back in for a refund.
  if (g === "channel") {
    const ground = s.ground.slice();
    ground[i] = "soil";
    return { state: { ...s, ground, channelsLeft: s.channelsLeft + 1 }, changed: true, effect: "filled" };
  }
  if (g !== "soil" || s.plants[i] || s.channelsLeft <= 0) return { state: s, changed: false, effect: "none" };
  const ground = s.ground.slice();
  ground[i] = "channel";
  return { state: { ...s, ground, channelsLeft: s.channelsLeft - 1 }, changed: true, effect: "dug" };
}

/** One growth step: every moist plant grows a stage. Nothing ever wilts. */
export function tick(s: GardenState): { state: GardenState; grew: number[] } {
  const natural = naturallyMoist(s);
  const grew: number[] = [];
  const plants = s.plants.map((p, i) => {
    if (!p || p.stage >= s.stages || !isMoist(s, i, natural)) return p;
    grew.push(i);
    return { ...p, stage: p.stage + 1 };
  });
  return { state: { ...s, plants, tick: s.tick + 1 }, grew };
}

export const isBloom = (s: GardenState, p: Plant | null): p is Plant => !!p && p.stage >= s.stages;

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function harmonyPairs(s: GardenState, companions: string[][]): [number, number][] {
  const ok = new Set(companions.map(([a, b]) => pairKey(a, b)));
  const pairs: [number, number][] = [];
  s.plants.forEach((p, i) => {
    if (!isBloom(s, p)) return;
    for (const j of neighbours(s, i)) {
      const q = s.plants[j];
      if (j > i && isBloom(s, q) && ok.has(pairKey(p.species, q.species))) pairs.push([i, j]);
    }
  });
  return pairs;
}

export function progress(s: GardenState, level: GardenLevel) {
  const blooms = s.plants.filter((p) => isBloom(s, p)).length;
  const harmonies = harmonyPairs(s, level.companions).length;
  return { blooms, harmonies, complete: blooms >= level.goalBlooms && harmonies >= level.goalHarmonies };
}

export interface GardenPlan {
  cells: { index: number; species: string }[];
}

/**
 * A feasible planting: `goalHarmonies` disjoint adjacent companion pairs plus
 * enough single plants, preferring soil that is already moist. Used to prove
 * a level is winnable and to drive automated QA.
 */
export function planGarden(level: GardenLevel): GardenPlan | null {
  const s = createGarden(level);
  const moist = naturallyMoist(s);
  const soil = s.ground.flatMap((g, i) => (g === "soil" ? [i] : []));
  const byMoisture = [...soil].sort((a, b) => Number(moist.has(b)) - Number(moist.has(a)));
  const used = new Set<number>();
  const cells: GardenPlan["cells"] = [];
  const [a, b] = level.companions[0] ?? [level.species[0].id, level.species[1].id];
  for (let h = 0; h < level.goalHarmonies; h++) {
    const first = byMoisture.find((i) => !used.has(i) && neighbours(s, i).some((j) => s.ground[j] === "soil" && !used.has(j)));
    if (first === undefined) return null;
    const second = neighbours(s, first)
      .filter((j) => s.ground[j] === "soil" && !used.has(j))
      .sort((x, y) => Number(moist.has(y)) - Number(moist.has(x)))[0];
    used.add(first).add(second);
    cells.push({ index: first, species: a }, { index: second, species: b });
  }
  // Single plants must not complete an extra companion pair by accident; that
  // would only help, so any species is fine. Prefer one that is not the pair.
  const single = level.species.find((sp) => sp.id !== a && sp.id !== b)?.id ?? a;
  for (const i of byMoisture) {
    if (cells.length >= level.goalBlooms) break;
    if (used.has(i)) continue;
    used.add(i);
    cells.push({ index: i, species: single });
  }
  return cells.length >= level.goalBlooms ? { cells } : null;
}
