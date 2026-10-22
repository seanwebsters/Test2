import "server-only";

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type TtsProvider = "elevenlabs" | "openai";

export function ttsProvider(): TtsProvider | null {
  const pref = process.env.TTS_PROVIDER;
  if ((pref === "elevenlabs" || !pref) && process.env.ELEVENLABS_API_KEY) return "elevenlabs";
  if ((pref === "openai" || !pref) && process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function providerStatus() {
  return { ai: aiConfigured(), model: aiConfigured() ? AI_MODEL : null, tts: ttsProvider() };
}
