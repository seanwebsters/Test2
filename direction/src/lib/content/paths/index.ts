import { CAREERS, getCareer } from "../careers";
import type { CareerPath, Level, Mission } from "../types";
import { creativeDirectorPath } from "./creative-director";
import { entrepreneurPath } from "./entrepreneur";
import { softwareEngineerPath } from "./software-engineer";
import { buildStarterPath } from "./starter";

const FULL: CareerPath[] = [creativeDirectorPath, entrepreneurPath, softwareEngineerPath];
const cache = new Map<string, CareerPath>(FULL.map((p) => [p.careerSlug, p]));

export function getPath(careerSlug: string): CareerPath | undefined {
  const hit = cache.get(careerSlug);
  if (hit) return hit;
  const career = getCareer(careerSlug);
  if (!career) return undefined;
  const path = buildStarterPath(career);
  cache.set(careerSlug, path);
  return path;
}

export function requirePath(careerSlug: string): CareerPath {
  const p = getPath(careerSlug);
  if (!p) throw new Error(`No path for ${careerSlug}`);
  return p;
}

export const FULL_PATH_SLUGS = FULL.map((p) => p.careerSlug);

export interface MissionRef {
  mission: Mission;
  level: Level;
  path: CareerPath;
}

/** Mission ids encode their path: cd-*, en-*, se-* or st-<slug>-*. */
export function findMission(missionId: string): MissionRef | undefined {
  let slug: string | undefined;
  if (missionId.startsWith("cd-")) slug = "creative-director";
  else if (missionId.startsWith("en-")) slug = "entrepreneur";
  else if (missionId.startsWith("se-")) slug = "software-engineer";
  else if (missionId.startsWith("st-")) {
    const m = /^st-(.+)-\d+-\d+$/.exec(missionId);
    slug = m?.[1];
  }
  if (!slug) return undefined;
  const path = getPath(slug);
  if (!path) return undefined;
  for (const level of path.levels) {
    const mission = level.missions.find((m) => m.id === missionId);
    if (mission) return { mission, level, path };
  }
  return undefined;
}

export function allPaths(): CareerPath[] {
  return CAREERS.map((c) => requirePath(c.slug));
}
