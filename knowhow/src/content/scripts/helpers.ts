import type { Challenge, EpisodeScript } from "@/lib/types";

export interface ScriptDraft {
  hook: string;
  story: string[];
  facts: string[];
  insight: string;
  outro: string;
  /** Lines listeners can save as collectible insights. */
  insights: string[];
  challenge?: Challenge;
}

/** Every episode follows the same shape: hook → story → facts → insight → ending. */
export function ep(d: ScriptDraft): EpisodeScript {
  return {
    segments: [
      { kind: "hook", text: d.hook },
      ...d.story.map((text) => ({ kind: "story" as const, text })),
      ...d.facts.map((text) => ({ kind: "fact" as const, text })),
      { kind: "insight", text: d.insight },
      { kind: "outro", text: d.outro },
    ],
    insights: d.insights,
    challenge: d.challenge,
  };
}
