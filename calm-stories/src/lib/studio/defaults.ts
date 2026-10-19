import type { StudioSettings, WritingGuidelines } from "./types";

export const DEFAULT_STUDIO_SETTINGS: Omit<StudioSettings, "updated_at"> = {
  id: "global",
  // Cost-optimised: agents default to Haiku 5.5; the Lead Writer and Creative Director use Sonnet 5.5.
  default_model: "claude-haiku-5-5",
  // Nano Banana (Gemini image generation). Change here when Google ships a newer model.
  image_model: "gemini-2.5-flash-image",
  image_size: "",
  fal_image_endpoint: "fal-ai/nano-banana",
  // ElevenLabs Flash: about half the cost of Multilingual v2.
  tts_model: "eleven_flash_v2_5",
  sfx_model: "eleven_text_to_sound_v2",
  music_model: "music_v1",
  max_revision_rounds: 1,
  max_episode_minutes: 10,
  cover_concepts: 1,
  // Six editorial reviews, or five scenes plus the cover, run at once.
  max_parallel_steps: 8,
  // Room for a full development slate plus episodes in production at the same time.
  max_concurrent_runs: 20,
  // Measured on real runs: writing ~$1.50–2, narration ~$0.70 for a 10-minute episode.
  default_episode_budget_cents: 300,
  default_series_budget_cents: 500,
  web_research: true,
  // Music is as important as narration: one cue per series, generated once and reused.
  episode_music: true,
  // House style: one calm narrator reads every part.
  single_narrator: true,
  narrator_voice: "Theo Silk Slow",
  publish_roles: ["admin", "editor"],
  autopilot: true,
  autopilot_pipeline: 10,
  autopilot_series_per_day: 10,
  autopilot_episodes_per_week: 2,
};

/**
 * House writing guidelines, shown to every writing and editorial agent.
 * Editable in Studio → Settings → Writing guidelines. Benchmarks are short
 * original passages written for the studio as quality references.
 */
export const DEFAULT_GUIDELINES: Omit<WritingGuidelines, "updated_at"> = {
  id: "global",
  content: `# Sleep Stories Studio – writing guidelines

## The promise
Premium, original adult romantasy that is a pleasure to fall asleep to. The listener should feel looked after: immersed, curious, warm, and never jolted.

## Episode shape
1. **Opening (first ~15%)** – an inviting hook: a vivid place, a charged moment between the leads, or a gentle mystery. Establish where and when within a few sentences.
2. **Heart (next ~35%)** – the episode's emotional core and its romance beat. Anything essential to the story happens here.
3. **Unwinding (next ~30%)** – consequences settle; scenes lengthen; dialogue thins; attention moves to place, ritual and comfort.
4. **Drift (final ~20%)** – the calmest writing: slow, sensory, repetitive in a soothing way, landing somewhere safe and warm. Nothing new the listener must remember.

## Prose
- Concrete over abstract: name the thing (bergamot, not "a scent"; the brass rail warm under her palm).
- Vary rhythm. Let later sentences lengthen and loosen.
- One strong image beats three adjectives.
- Write for the ear: avoid tongue-twisters, ambiguous pronouns across long passages, and parentheses.
- Use the series' point of view and tense consistently.

## Dialogue
- Every line should sound like one specific person and carry something unsaid.
- No exposition dumps, no therapy-speak, no characters explaining their feelings in full sentences.
- Fewer, better lines. Silence and gesture count.

## Romance
- Slow burn: tension grows from character, not coincidence.
- Intimacy is tender and suggestive; nothing explicit.
- Small earned moments (a borrowed coat, a remembered detail) over grand declarations.

## Sleep safety
- No sudden loud events, violence, peril, horror, or cliffhangers.
- Conflict is emotional and gentle; resolutions are kind.
- Avoid late revelations; the last fifth should be skippable without loss.

## Banned patterns
"a breath she didn't know she was holding", "tapestry of", "symphony of", "testament to", "little did they know", "electric" touches, rhetorical questions in narration, ending scenes on a summary of what it all meant.

## Originality
Original worlds, magic, names and characters. Never borrow protected characters, places, magic systems or distinctive story elements from existing works.`,
  benchmarks: [
    {
      title: "Opening with pull",
      excerpt:
        "The night train to Ossery left at the hour when the station lamps were lit by hand. Wren had a ticket for carriage nine, a suitcase with a broken clasp, and no intention of speaking to the man who had just sat down opposite her – the man whose name was printed, in very small gold letters, on the inside of her ticket.",
      why: "Place, time, character and a gentle question in three sentences, with a light touch of romance and no exposition.",
    },
    {
      title: "Dialogue with subtext",
      excerpt:
        "“You kept it,” he said, looking at the folded map on her knee.\n“It's a good map.”\n“It's a terrible map. I drew it.”\nShe smoothed a crease that did not need smoothing. “Then it's a good map badly drawn.”",
      why: "Neither says what they feel; the gesture and the joke carry it. Each voice is distinct.",
    },
    {
      title: "Drifting toward sleep",
      excerpt:
        "Outside, the fields went by in the dark, one after another, each a little softer than the last. The carriage rocked. The lamp burned low and steady. Somewhere ahead the engine breathed its long, patient breath, and the rails answered it, and the night carried them all along, unhurried, toward morning.",
      why: "Longer sentences, repetition used as comfort, gentle sensory anchors, nothing new to track.",
    },
  ],
};
