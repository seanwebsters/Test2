/**
 * Rights & permissions service.
 *
 * Every selection the user makes in Create is validated against the rights
 * holder's configuration before it reaches the Dream Engine. When real IP is
 * added, these rules come from the partner admin console (Postgres tables:
 * partners, ip_worlds, usage_rules, crossover_permissions).
 */
import type { Character, CrossoverPermissions, DreamTone, IPWorld, UsageRules } from "../types";
import { partnerById } from "../data/partners";
import { worldById } from "../data/worlds";
import { characterById } from "../data/characters";

export function effectiveUsageRules(world: IPWorld): UsageRules {
  const partner = partnerById(world.partnerId)!;
  return { ...partner.defaultUsageRules, ...world.usageRules };
}

export function effectiveCrossover(world: IPWorld): CrossoverPermissions {
  const partner = partnerById(world.partnerId)!;
  const merged = { ...partner.crossover, ...world.crossover };
  // a world can only narrow its partner's permission
  merged.crossoverAllowed = partner.crossover.crossoverAllowed && (world.crossover?.crossoverAllowed ?? true);
  return merged;
}

/** Can world A appear in the same dream as world B (checked both directions)? */
export function worldsCompatible(a: IPWorld, b: IPWorld): { ok: boolean; reason?: string } {
  if (a.id === b.id) return { ok: true };
  for (const [x, y] of [
    [a, b],
    [b, a],
  ] as const) {
    const c = effectiveCrossover(x);
    if (!c.crossoverAllowed) return { ok: false, reason: c.note ?? `${x.title} does not allow crossovers.` };
    if (c.blockedWorlds.includes(y.id)) return { ok: false, reason: c.note ?? `${x.title} can't be mixed with ${y.title}.` };
    if (c.allowedPartners !== "*" && !c.allowedPartners.includes(y.partnerId))
      return { ok: false, reason: c.note ?? `${x.title}'s rights holder hasn't approved crossovers with ${y.title}.` };
  }
  return { ok: true };
}

/** Why a world can't be added to the current selection, or null if it can. */
export function worldBlockReason(candidateId: string, selectedIds: string[]): string | null {
  const cand = worldById(candidateId);
  if (!cand) return "Unknown world";
  for (const id of selectedIds) {
    if (id === candidateId) continue;
    const other = worldById(id)!;
    const r = worldsCompatible(cand, other);
    if (!r.ok) return r.reason!;
  }
  return null;
}

/** Characters may appear only if their world is selected or crossover is permitted. */
export function characterBlockReason(char: Character, selectedCharIds: string[], selectedWorldIds: string[]): string | null {
  const world = worldById(char.worldId)!;
  const otherWorlds = new Set(
    selectedCharIds.map((id) => characterById(id)?.worldId).filter((w): w is string => !!w && w !== char.worldId),
  );
  if (otherWorlds.size > 0 && !char.crossoverAllowed)
    return `${char.name} stays inside ${world.title} — the rights holder doesn't permit this character in crossovers.`;
  for (const wid of otherWorlds) {
    const other = worldById(wid)!;
    const otherChar = selectedCharIds.map(characterById).find((c) => c?.worldId === wid);
    if (otherChar && !otherChar.crossoverAllowed) return `${otherChar.name} can only appear with characters from ${other.title}.`;
    const r = worldsCompatible(world, other);
    if (!r.ok) return r.reason!;
  }
  if (!selectedWorldIds.includes(char.worldId)) {
    const r = worldBlockReason(char.worldId, selectedWorldIds);
    if (r) return r;
  }
  return null;
}

/** Tones permitted by every world in the selection. */
export function allowedTones(worldIds: string[]): Set<DreamTone> {
  const all: DreamTone[] = ["cozy", "adventure", "mystery", "funny", "romantic", "epic", "nostalgic", "very-sleepy"];
  return new Set(
    all.filter((t) =>
      worldIds.every((id) => {
        const w = worldById(id);
        if (!w) return true;
        const rules = effectiveUsageRules(w);
        return w.allowedThemes.includes(t) && (rules.allowedTones.length === 0 || rules.allowedTones.includes(t));
      }),
    ),
  );
}

/** Collected restrictions handed to the Dream Engine's system prompt. */
export function compileRestrictions(worldIds: string[], characterIds: string[]) {
  const worldsSel = worldIds.map(worldById).filter(Boolean) as IPWorld[];
  const chars = characterIds.map(characterById).filter(Boolean) as Character[];
  const restrictedThemes = new Set<string>();
  const storyRestrictions: string[] = [];
  const contentRestrictions: string[] = [];
  for (const w of worldsSel) {
    const r = effectiveUsageRules(w);
    r.restrictedThemes.forEach((t) => restrictedThemes.add(t));
    storyRestrictions.push(...r.storyRestrictions.map((s) => `[${w.title}] ${s}`));
    contentRestrictions.push(...w.contentRestrictions.map((s) => `[${w.title}] ${s}`));
  }
  const brandSafety = chars.flatMap((c) => c.brandSafetyRules.map((r) => `[${c.name}] ${r}`));
  const romanceAllowed = chars.length > 0 && chars.every((c) => c.allowedInteractions.includes("romance"));
  return { restrictedThemes: [...restrictedThemes], storyRestrictions, contentRestrictions, brandSafety, romanceAllowed };
}

export function creditsFor(worldIds: string[]) {
  const ids = new Set(worldIds.map((w) => worldById(w)?.partnerId).filter(Boolean) as string[]);
  return [...ids].map((p) => partnerById(p)!.credit);
}
