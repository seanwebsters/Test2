import type { AgentKey, WorkflowStep } from "./types";

export type StageStatus = "completed" | "in_progress" | "pending" | "blocked" | "awaiting" | "failed";

export interface Stage {
  key: string;
  label: string;
  sub: string;
  agent: AgentKey;
  status: StageStatus;
}

const EPISODE_STAGES: { key: string; label: string; sub: string; agent: AgentKey; match: (s: WorkflowStep) => boolean }[] = [
  { key: "outline", label: "Outline", sub: "Episode arc", agent: "series_architect", match: (s) => s.type === "ep.outline" },
  { key: "scenes", label: "Scene plan", sub: "Scene by scene", agent: "lead_writer", match: (s) => s.type === "ep.scene_plan" },
  { key: "draft", label: "Draft", sub: "Full script", agent: "lead_writer", match: (s) => s.type === "ep.draft" },
  { key: "review", label: "Editorial review", sub: "Six editors", agent: "story_critic", match: (s) => s.type === "ep.review" || s.type === "ep.synthesis" },
  { key: "rewrites", label: "Rewrites", sub: "Targeted revisions", agent: "lead_writer", match: (s) => s.type === "ep.rewrite" || s.type === "ep.human_notes" },
  { key: "final", label: "Final script", sub: "Bible updated", agent: "continuity_editor", match: (s) => s.type === "ep.finalize" },
  { key: "art", label: "Artwork", sub: "Cover concepts", agent: "art_director", match: (s) => s.type.startsWith("art.") },
  { key: "audio", label: "Audio production", sub: "Voice and sound", agent: "audio_producer", match: (s) => s.type.startsWith("audio.") },
  { key: "qc", label: "Quality control", sub: "Final review", agent: "quality_controller", match: (s) => s.type === "qc.review" },
  { key: "approval", label: "Human approval", sub: "Your decision", agent: "network_executive", match: (s) => s.type === "ep.approval" },
];

const SERIES_STAGES: typeof EPISODE_STAGES = [
  { key: "research", label: "Research", sub: "Genre and catalogue", agent: "program_director", match: (s) => s.type === "series.research" },
  { key: "concepts", label: "Concepts", sub: "Three ideas", agent: "creative_director", match: (s) => s.type === "series.concepts" },
  { key: "critique", label: "Critique", sub: "Pick the strongest", agent: "story_critic", match: (s) => s.type === "series.critique" },
  { key: "bible", label: "Series bible", sub: "Identity, world, cast", agent: "worldbuilder", match: (s) => ["series.identity", "series.world", "series.characters", "series.romance"].includes(s.type) },
  { key: "season", label: "Season plan", sub: "Episode arcs", agent: "series_architect", match: (s) => s.type === "series.season" },
  { key: "continuity", label: "Continuity", sub: "Consistency check", agent: "continuity_editor", match: (s) => s.type === "series.continuity" || s.type === "series.fix" },
  { key: "art", label: "Visual identity", sub: "Posters and portraits", agent: "art_director", match: (s) => s.type.startsWith("art.") },
  { key: "greenlight", label: "Greenlight", sub: "Your decision", agent: "network_executive", match: (s) => s.type === "series.greenlight" },
  { key: "casting", label: "Casting", sub: "Voices and names", agent: "audio_director", match: (s) => s.type === "audio.casting" || s.type === "audio.pronunciation" },
];

export function pipelineStages(kind: "series_development" | "episode_production", steps: WorkflowStep[], runStatus: string): Stage[] {
  const defs = kind === "series_development" ? SERIES_STAGES : EPISODE_STAGES;
  const stages = defs.map((d) => {
    const mine = steps.filter(d.match);
    let status: StageStatus = "pending";
    if (mine.some((s) => s.status === "failed")) status = "failed";
    else if (mine.some((s) => s.status === "blocked")) status = "blocked";
    else if (mine.some((s) => s.status === "awaiting_approval")) status = "awaiting";
    else if (mine.some((s) => s.status === "running" || s.status === "waiting")) status = "in_progress";
    else if (mine.length && mine.every((s) => ["succeeded", "skipped"].includes(s.status))) status = "completed";
    else if (mine.length && mine.some((s) => s.status === "succeeded") && mine.some((s) => s.status === "pending")) status = "in_progress";
    if (d.key === "rewrites" && !mine.length && steps.some((s) => s.type === "ep.finalize" && s.status === "succeeded")) status = "completed";
    return { key: d.key, label: d.label, sub: d.key === "rewrites" && mine.length ? `${mine.length} round(s)` : d.sub, agent: d.agent, status };
  });
  if (kind === "episode_production") stages.push({ key: "publish", label: "Publish", sub: "Live in app", agent: "network_executive", status: runStatus === "succeeded" ? "completed" : "pending" });
  return stages;
}
