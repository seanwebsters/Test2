import "server-only";
import { callAgent, type CallResult } from "../ai/client";
import { configSchemaFor, type Archetype, type GameConfig, type Theme } from "../engine/schemas";
import { validateBuild, validateConfig } from "../engine/validate";
import { sanitizeSvg } from "../svg";
import { contrastRatio } from "../design-system/color";
import type { AgentId, QAReport, Settings } from "../types";
import { ART_SYSTEM, DESIGN_SYSTEM, DEVELOPMENT_SYSTEM, FREEFORM_SYSTEM, IDEATION_SYSTEM, INSIGHTS_SYSTEM } from "./prompts";
import {
  artSchema,
  designSchema,
  freeformSchema,
  ideationSchema,
  labAssessmentSchema,
  labIdeasSchema,
  reviewSchema,
  type ArtOutput,
  type DesignOutput,
  type FreeformOutput,
  type IdeationOutput,
  type LabConcept,
  type ReviewOutput,
} from "./schemas";

export interface AgentContext {
  settings: Settings;
  jobId: string;
  onActivity: (text: string) => void | Promise<void>;
}
const opts = (ctx: AgentContext, agent: AgentId) => ({ agent, model: ctx.settings.models[agent], effort: ctx.settings.effort, jobId: ctx.jobId, onActivity: ctx.onActivity });
const j = (v: unknown) => JSON.stringify(v, null, 1);

/** Refinement context handed to every agent when changing an existing version. */
export interface RefineContext {
  instruction: string;
  previous: { ideation?: IdeationOutput; design?: DesignOutput; art?: ArtOutput; config?: GameConfig; freeform?: FreeformOutput };
}
const refineBlock = (r: RefineContext | undefined, key: keyof RefineContext["previous"]) =>
  r
    ? `\n\nThis is a REFINEMENT of an existing game. The player-facing change requested is:\n"${r.instruction}"\n\nYour previous output for this game was:\n${j(r.previous[key] ?? "(none — the game was hand-authored)")}\n\nApply the requested change. Keep everything the request doesn't touch, so the game stays recognisably the same.`
    : "";

export function ideate(ctx: AgentContext, input: { prompt: string; category?: string; archetype?: string; concept?: LabConcept }, refine?: RefineContext) {
  const prefer = input.archetype && input.archetype !== "auto" ? `\nThe user asked for the "${input.archetype}" archetype; use it.` : "";
  const concept = input.concept ? `\nStart from this concept chosen in the Creative Lab and develop it:\n${j(input.concept)}` : "";
  return callAgent({
    ...opts(ctx, "ideation"),
    system: IDEATION_SYSTEM,
    schema: ideationSchema,
    prompt: `Creative brief:\n"${input.prompt}"${input.category ? `\nCategory: ${input.category}` : ""}${prefer}${concept}${refineBlock(refine, "ideation")}\n\nReturn the concept as JSON.`,
    check: (v) => (refine?.previous.config && v.archetype !== refine.previous.config.archetype && !/archetype|different game|change the game type/i.test(refine.instruction) ? [`keep the archetype "${refine.previous.config.archetype}" unless the request explicitly asks to change the kind of game`] : []),
  });
}

export function design(ctx: AgentContext, ideation: IdeationOutput, refine?: RefineContext) {
  return callAgent({
    ...opts(ctx, "design"),
    system: DESIGN_SYSTEM,
    schema: designSchema,
    prompt: `Concept from the Creative Director:\n${j(ideation)}${refineBlock(refine, "design")}\n\nWrite the game design specification as JSON. levelDesignNotes must give concrete numbers the developer can use for the "${ideation.archetype}" archetype.`,
  });
}

export function artDirect(ctx: AgentContext, ideation: IdeationOutput, designSpec: DesignOutput, refine?: RefineContext) {
  return callAgent({
    ...opts(ctx, "art"),
    system: ART_SYSTEM,
    schema: artSchema,
    prompt: `Concept:\n${j(ideation)}\n\nDesign:\n${j({ coreLoop: designSpec.coreLoop, feedback: designSpec.feedback, rewards: designSpec.rewards })}${refineBlock(refine, "art")}\n\nReturn the art direction as JSON.`,
    check: (v) => {
      const problems = v.assets.flatMap((a, i) => (sanitizeSvg(a.svg) ? [] : [`assets[${i}].svg is not a usable self-contained <svg> element under 12 KB`]));
      const ink = v.palette.ink;
      for (const stop of [v.palette.sky[0], v.palette.sky.at(-1)!]) {
        const ratio = contrastRatio(ink, stop);
        if (ratio < 4.5) problems.push(`palette: ink ${ink} on sky ${stop} is ${ratio.toFixed(2)}:1; it must reach 4.5:1`);
      }
      return problems;
    },
  });
}

export function themeFromArt(art: ArtOutput): Theme {
  return {
    ...art.palette,
    particles: art.particles,
    particleDensity: art.particleDensity,
    motionTempo: art.motionTempo,
    soundScale: art.sound.scale,
    soundRoot: art.sound.root,
  };
}

const devSchemas = {
  "tile-path": configSchemaFor["tile-path"].omit({ theme: true }),
  garden: configSchemaFor.garden.omit({ theme: true }),
  constellation: configSchemaFor.constellation.omit({ theme: true }),
};
const devSchema = (a: Archetype) => devSchemas[a] as typeof devSchemas["tile-path"];

export async function develop(
  ctx: AgentContext,
  specs: { ideation: IdeationOutput; design: DesignOutput; art: ArtOutput },
  refine?: RefineContext,
): Promise<CallResult<GameConfig>> {
  const archetype = specs.ideation.archetype as Archetype;
  const theme = themeFromArt(specs.art);
  const previous = refine?.previous.config ? { ...refine.previous.config, theme: undefined } : undefined;
  const result = await callAgent({
    ...opts(ctx, "development"),
    system: DEVELOPMENT_SYSTEM,
    schema: devSchema(archetype),
    prompt: `Implement this game as a "${archetype}" configuration.\n\nConcept:\n${j(specs.ideation)}\n\nDesign specification:\n${j(specs.design)}\n\nArt direction (the runtime applies the palette itself):\n${j({ environment: specs.art.environment, visualElements: specs.art.visualElements })}${
      refine ? `\n\nThis is a REFINEMENT. Requested change: "${refine.instruction}"\nCurrent configuration:\n${j(previous ?? "(none)")}\nKeep what the request doesn't touch.` : ""
    }\n\nReturn the configuration JSON with archetype "${archetype}".`,
    check: (v) => validateConfig({ ...v, theme }).errors,
    maxAttempts: 4,
  });
  return { ...result, data: { ...result.data, theme } as GameConfig };
}

export async function repair(ctx: AgentContext, config: GameConfig, qa: QAReport, specs: { design?: DesignOutput }): Promise<CallResult<GameConfig>> {
  const failures = qa.checks.filter((c) => c.status === "fail").map((c) => `- ${c.label}: ${c.detail}`).join("\n");
  const { theme, ...rest } = config;
  const result = await callAgent({
    ...opts(ctx, "development"),
    system: DEVELOPMENT_SYSTEM,
    schema: devSchema(config.archetype),
    prompt: `QA found problems when it loaded and played this game in a real browser.\n\nFailures:\n${failures}\n${qa.consoleErrors.length ? `\nConsole errors:\n${qa.consoleErrors.slice(0, 10).join("\n")}\n` : ""}\nCurrent configuration:\n${j(rest)}\n${specs.design ? `\nDesign intent:\n${j({ coreLoop: specs.design.coreLoop, winCondition: specs.design.winCondition })}\n` : ""}\nFix the configuration so every check passes. Change as little as possible. Return the complete corrected configuration JSON.`,
    check: (v) => validateConfig({ ...v, theme }).errors,
    maxAttempts: 3,
  });
  return { ...result, data: { ...result.data, theme } as GameConfig };
}

export function developFreeform(ctx: AgentContext, specs: { ideation: IdeationOutput; design: DesignOutput; art: ArtOutput }, refine?: RefineContext, qaFailures?: string) {
  return callAgent({
    ...opts(ctx, "development"),
    system: FREEFORM_SYSTEM,
    schema: freeformSchema,
    maxTokens: 64000,
    prompt: `Concept:\n${j(specs.ideation)}\n\nDesign:\n${j(specs.design)}\n\nArt direction:\n${j(specs.art)}${
      refine?.previous.freeform ? `\n\nREFINEMENT requested: "${refine.instruction}"\nCurrent document:\n${refine.previous.freeform.html}` : ""
    }${qaFailures ? `\n\nQA failures in the previous build to fix:\n${qaFailures}` : ""}\n\nReturn JSON with the complete HTML document.`,
    check: (v) => validateBuild({ mode: "freeform", title: v.title, engine: v.engine, html: v.html }).errors,
  });
}

export interface PlayStats {
  sessions: number;
  completions: number;
  levels: { level: number; starts: number; completes: number; medianSeconds: number | null }[];
  restarts: number;
  errors: number;
}

export function review(ctx: AgentContext, input: { ideation?: IdeationOutput; design?: DesignOutput; config?: GameConfig; freeform?: boolean; qa?: QAReport; stats?: PlayStats }) {
  const config = input.config ? { ...input.config, levels: input.config.levels.map((l) => ({ ...l })) } : undefined;
  return callAgent({
    ...opts(ctx, "insights"),
    system: INSIGHTS_SYSTEM,
    schema: reviewSchema,
    prompt: `Review this game.\n\nConcept:\n${j(input.ideation ?? "(hand-authored)")}\n\nDesign:\n${j(input.design ?? "(hand-authored)")}\n\n${input.freeform ? "Build: experimental freeform code." : `Configuration:\n${j(config)}`}\n\nAutomated QA:\n${j(input.qa ? { passed: input.qa.passed, ran: input.qa.ran, checks: input.qa.checks } : "QA did not run")}\n\nPlay-session data recorded by the studio:\n${
      input.stats && input.stats.sessions > 0 ? j(input.stats) : "None yet. Treat every recommendation as a hypothesis."
    }\n\nReturn your review as JSON.`,
  });
}

export async function labIdeas(ctx: AgentContext, brief: string, count: number) {
  return callAgent({
    ...opts(ctx, "ideation"),
    agent: "lab",
    system: IDEATION_SYSTEM,
    schema: labIdeasSchema,
    prompt: `Generate exactly ${count} new calming game concepts${brief ? ` for this brief: "${brief}"` : ""}. They must be genuinely different from each other in mechanic, setting and emotional goal, not variations of one idea. Favour the three reliable archetypes, but include a freeform idea if it is truly better.`,
    check: (v) => (v.concepts.length !== count ? [`return exactly ${count} concepts (got ${v.concepts.length})`] : []),
  });
}

export async function labAssess(ctx: AgentContext, concepts: LabConcept[]) {
  return callAgent({
    ...opts(ctx, "design"),
    agent: "lab",
    system: DESIGN_SYSTEM,
    schema: labAssessmentSchema,
    prompt: `Assess these concepts for complexity and feasibility in this studio. "Ready now" means it maps cleanly onto tile-path, garden or constellation. "Needs freeform mode" means it would need the experimental code mode. "Needs new archetype" means it needs a new tested template.\n\n${j(concepts)}\n\nReturn one assessment per concept, using the exact concept names.`,
    check: (v) => concepts.filter((c) => !v.assessments.some((a) => a.name === c.name)).map((c) => `missing an assessment for "${c.name}"`),
  });
}

export type { ReviewOutput };
