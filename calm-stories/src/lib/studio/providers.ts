import "server-only";
import { env } from "@/lib/env";
import { findFfmpeg } from "@/lib/audio/ffmpeg";

let ff: boolean | undefined;

/** Which providers are connected. Never exposes keys. */
export function providerStatus() {
  ff ??= Boolean(findFfmpeg(env.ffmpegPath));
  return [
    { key: "ANTHROPIC_API_KEY", name: "Claude (Anthropic)", role: "Writing, editorial, critique and image-review agents", connected: Boolean(env.anthropicApiKey) },
    { key: env.geminiApiKey || !env.falKey ? "GEMINI_API_KEY" : "FAL_KEY", name: env.falKey && !env.geminiApiKey ? "Nano Banana (via fal.ai)" : "Nano Banana (Google Gemini)", role: "Posters, portraits, covers and promo art – GEMINI_API_KEY or FAL_KEY", connected: Boolean(env.geminiApiKey || env.falKey) },
    { key: "ELEVENLABS_API_KEY", name: "ElevenLabs", role: "Voices, narration, pronunciation, sound effects and music", connected: Boolean(env.elevenLabsApiKey) },
    { key: "FFMPEG", name: "FFmpeg", role: "Mixing, mastering and loudness measurement (bundled with the app)", connected: ff },
  ];
}
