import type { AgentSettings } from "@/lib/types";

/**
 * Starting configuration for the production agents. Editable in
 * Admin → Agent settings; model ids can also be changed there when
 * providers release new versions.
 */
export const DEFAULT_AGENT_SETTINGS: Omit<AgentSettings, "updated_at"> = {
  id: "global",
  writer_model: "claude-opus-5-5",
  tts_model: "eleven_multilingual_v2",
  // ElevenLabs premade voice "George" (warm British narrator). Replace with your licensed voice.
  default_voice_id: "JBFqnCBsd6RMkjVDRZzb",
  sfx_model: "eleven_text_to_sound_v2",
  // "Nano Banana" – Gemini image generation.
  image_model: "gemini-2.5-flash-image",
  per_job_budget_cents: 500,
  max_concurrent_jobs: 2,
};
