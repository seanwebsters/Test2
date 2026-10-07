/**
 * Dream Engine service.
 *
 *   Official IP → Dream Engine → Personalised Dream → Consumer
 *
 * `DreamEngine` is the seam where a real LLM plugs in. The app only ever calls
 * `dreamEngine.generate(input)`. Today that resolves to the mock provider;
 * swapping in `LLMDreamEngine` (with any chat-completion adapter) changes
 * nothing else in the app.
 */
import type { DreamEngineInput, DreamEngineOutput } from "../types";
import { worldById } from "../data/worlds";
import { characterById } from "../data/characters";
import { loreDocuments } from "../data/partners";
import { compileRestrictions } from "../services/rights";
import { DREAM_ENGINE_SYSTEM_PROMPT, buildEngineMessage } from "./systemPrompt";
import { generateMockDream } from "./mockGenerator";

export interface DreamEngine {
  readonly name: string;
  generate(input: DreamEngineInput): Promise<DreamEngineOutput>;
}

/**
 * Expands ids into the full grounded payload a model needs: canon lore,
 * character sheets, rights restrictions and the sleep plan.
 */
export function buildGroundedPayload(input: DreamEngineInput) {
  const worlds = input.worlds.map(worldById).filter(Boolean).map((w) => ({
    id: w!.id,
    title: w!.title,
    lore: w!.lore,
    locations: w!.locations,
    sounds: w!.sounds,
    visual_style: w!.visualStyle,
    lore_documents: loreDocuments.filter((d) => d.worldId === w!.id),
  }));
  const characters = input.characters.map(characterById).filter(Boolean).map((c) => ({
    id: c!.id,
    name: c!.name,
    world: c!.worldId,
    personality: c!.personality,
    speaking_style: c!.speakingStyle,
    sample_lines: c!.sampleLines,
    relationship_traits: c!.relationshipTraits,
    lore_knowledge: c!.loreKnowledge,
    allowed_interactions: c!.allowedInteractions,
    brand_safety_rules: c!.brandSafetyRules,
    voice_id: c!.voiceId,
  }));
  return {
    request: input,
    worlds,
    characters,
    restrictions: compileRestrictions(input.worlds, input.characters),
    sleep_plan: { sleepiness: input.sleepiness, length: input.length },
    output_schema: "DreamEngineOutput",
  };
}

/** Local, deterministic provider — no keys needed. */
export class MockDreamEngine implements DreamEngine {
  readonly name = "mock";
  async generate(input: DreamEngineInput) {
    // Simulate a short "dreaming up" latency so the UI can show its loading state.
    await new Promise((r) => setTimeout(r, 1400));
    return generateMockDream(input);
  }
}

/** Adapter any LLM vendor SDK can satisfy. */
export type ChatCompletion = (args: { system: string; user: string }) => Promise<string>;

/**
 * Production provider. Wire `complete` to your model of choice, ideally from a
 * server route (so keys never reach the browser). Falls back to the mock on
 * malformed output so a listener is never left without a story at bedtime.
 */
export class LLMDreamEngine implements DreamEngine {
  readonly name = "llm";
  constructor(private complete: ChatCompletion) {}
  async generate(input: DreamEngineInput) {
    const payload = buildGroundedPayload(input);
    try {
      const raw = await this.complete({ system: DREAM_ENGINE_SYSTEM_PROMPT, user: buildEngineMessage(payload) });
      const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as DreamEngineOutput;
      if (!json.chapters?.length) throw new Error("empty chapters");
      return json;
    } catch {
      return generateMockDream(input);
    }
  }
}

export const dreamEngine: DreamEngine = new MockDreamEngine();
