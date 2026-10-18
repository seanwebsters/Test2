import type { EvidenceType, Level, Mission, MissionKind } from "../types";

interface MissionSpec {
  title: string;
  objective: string;
  minutes: number;
  kind: MissionKind;
  /** "skill:points, skill:points" */
  skills: string;
  steps: string[];
  evidence?: EvidenceType;
  aiHelp?: string;
  tags?: string[];
}

function parseSkills(spec: string): { id: string; points: number }[] {
  return spec
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [id, pts] = s.split(":");
      return { id: id!.trim(), points: Number(pts ?? 5) };
    });
}

/** Default evidence: quests and create missions ask for proof, reflections ask for a reflection. */
function defaultEvidence(kind: MissionKind): EvidenceType {
  if (kind === "quest" || kind === "create") return "text";
  if (kind === "reflect") return "reflection";
  return "none";
}

export function mission(id: string, spec: MissionSpec): Mission {
  const quest = spec.kind === "quest";
  return {
    id,
    title: spec.title,
    objective: spec.objective,
    minutes: spec.minutes,
    kind: spec.kind,
    steps: spec.steps,
    evidence: quest && (spec.evidence ?? "text") === "none" ? "text" : (spec.evidence ?? defaultEvidence(spec.kind)),
    skills: parseSkills(spec.skills),
    aiHelp: spec.aiHelp,
    tags: spec.tags,
    quest,
  };
}

interface LevelSpec {
  title: string;
  summary: string;
  milestone: string;
  missions: MissionSpec[];
}

/** Builds levels with stable ids: `${prefix}-${level}-${index}`. */
export function levels(prefix: string, specs: LevelSpec[]): Level[] {
  return specs.map((l, li) => ({
    n: li + 1,
    title: l.title,
    summary: l.summary,
    milestone: l.milestone,
    missions: l.missions.map((m, mi) => mission(`${prefix}-${li + 1}-${mi + 1}`, m)),
  }));
}

export type { LevelSpec, MissionSpec };
