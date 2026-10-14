import { describe, expect, it } from "vitest";
import { renderAmbience } from "@/lib/audio/synth";
import { decodeWav, encodeWav, SAMPLE_RATE } from "@/lib/audio/wav";
import { concatSections, mixEpisode } from "@/lib/audio/mixer";
import { analyzeAudio } from "@/lib/audio/qa";
import { SimulatedTts, splitSections } from "@/lib/audio/tts";
import type { VoiceProfile } from "@/lib/types";

const voice: VoiceProfile = { id: "v", name: "Willow", description: "", provider: "mock", provider_voice_id: "x", accent: "", tone: "warm", approved: true, consent_record: "", created_at: "" };

describe("audio pipeline", () => {
  it("round-trips WAV", () => {
    const s = new Float32Array([0, 0.5, -0.5, 0.25]);
    const back = decodeWav(encodeWav(s)).samples;
    expect(back.length).toBe(4);
    expect(back[1]).toBeCloseTo(0.5, 3);
  });
  it("renders ambience without clipping", () => {
    const amb = renderAmbience([{ kind: "rain", gain: 0.8 }, { kind: "thunder", gain: 0.5 }], 20, { seed: 1 });
    const qa = analyzeAudio(amb, SAMPLE_RATE);
    expect(qa.clipped_samples).toBe(0);
    expect(qa.peak_dbfs).toBeLessThan(-1);
  });
  it("mixes narration with ducked ambience at bedtime loudness", async () => {
    const tts = new SimulatedTts();
    const sections = splitSections("First paragraph of a calm story.\n\nSecond paragraph, slow and gentle.\n\n---\n\nThird section after a break.");
    expect(sections).toHaveLength(2);
    const narrated = await Promise.all(sections.map((t) => tts.synthesize({ text: t, voice, speed: 0.9, warmth: 0.7, stability: 0.7 })));
    expect(narrated.every((n) => n.simulated)).toBe(true);
    const narration = concatSections(narrated, 1);
    const mix = mixEpisode(narration, { ambience: renderAmbience([{ kind: "rain", gain: 0.8 }], 30, { seed: 2 }), ambienceVolume: 0.4, musicVolume: 0.1, postRollSeconds: 10 });
    const qa = analyzeAudio(mix.samples, mix.sampleRate, { expectedSections: 2, actualSections: 2, ambienceToNarrationDb: mix.ambienceToNarrationDb });
    expect(qa.clipped_samples).toBe(0);
    expect(qa.integrated_loudness_approx_lufs).toBeLessThan(-18);
    expect(qa.integrated_loudness_approx_lufs).toBeGreaterThan(-32);
    expect(qa.issues.find((i) => i.check === "missing_segments")?.severity).toBe("pass");
    expect(mix.ambienceToNarrationDb!).toBeLessThan(-10);
  });
  it("flags missing sections", () => {
    const qa = analyzeAudio(new Float32Array(SAMPLE_RATE * 2), SAMPLE_RATE, { expectedSections: 3, actualSections: 2 });
    expect(qa.passed).toBe(false);
  });
});
