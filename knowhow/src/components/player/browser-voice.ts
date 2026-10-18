import type { SegmentKind, TranscriptLine } from "@/lib/types";

/** Narration speed assumed when estimating browser-voice timings (words per second at 1×). */
export const WORDS_PER_SECOND = 2.6;

export function estimateLines(segments: { kind: SegmentKind; text: string }[]): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  let t = 0;
  for (const seg of segments) {
    for (const s of seg.text.split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/).filter(Boolean)) {
      const d = Math.max(1.2, s.split(/\s+/).length / WORDS_PER_SECOND);
      lines.push({ t0: t, t1: t + d, text: s, kind: seg.kind });
      t += d + 0.3;
    }
    t += 0.4;
  }
  return lines;
}

/**
 * DEVELOPMENT FALLBACK: reads a script aloud with the browser's built-in speech
 * synthesis when no TTS provider produced an audio file. The UI labels it as such.
 * Timing is estimated per sentence, so seeking jumps to sentence boundaries.
 */
export class BrowserVoice {
  playing = false;
  private index = 0;
  private rate = 1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private sentenceStart = 0;
  private token = 0;

  constructor(private lines: TranscriptLine[], private cb: { onTime: (t: number) => void; onEnd: () => void; onState: (playing: boolean) => void }) {}

  static supported() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  setRate(r: number) {
    this.rate = r;
    if (this.playing) this.play(this.lines[this.index]?.t0 ?? 0);
  }

  play(from = 0) {
    if (!BrowserVoice.supported()) return;
    window.speechSynthesis.cancel();
    this.index = Math.max(0, this.lines.findIndex((l) => l.t1 > from));
    if (this.index < 0) this.index = 0;
    this.playing = true;
    this.cb.onState(true);
    this.speak(++this.token);
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      const l = this.lines[this.index];
      if (!l || !this.playing) return;
      const elapsed = ((performance.now() - this.sentenceStart) / 1000) * this.rate;
      this.cb.onTime(Math.min(l.t1, l.t0 + elapsed));
    }, 250);
  }

  private speak(token: number) {
    const l = this.lines[this.index];
    if (!l) {
      this.stop();
      this.cb.onEnd();
      return;
    }
    const u = new SpeechSynthesisUtterance(l.text);
    u.rate = this.rate;
    u.lang = "en-GB";
    u.onstart = () => {
      this.sentenceStart = performance.now();
      this.cb.onTime(l.t0);
    };
    u.onend = () => {
      if (token !== this.token || !this.playing) return;
      this.index++;
      this.speak(token);
    };
    window.speechSynthesis.speak(u);
  }

  pause() {
    this.playing = false;
    this.token++;
    window.speechSynthesis?.cancel();
    this.cb.onState(false);
  }

  seek(t: number) {
    if (this.playing) this.play(t);
    else {
      this.index = Math.max(0, this.lines.findIndex((l) => l.t1 > t));
      this.cb.onTime(t);
    }
  }

  stop() {
    this.playing = false;
    this.token++;
    if (this.timer) clearInterval(this.timer);
    if (BrowserVoice.supported()) window.speechSynthesis.cancel();
    this.cb.onState(false);
  }
}
