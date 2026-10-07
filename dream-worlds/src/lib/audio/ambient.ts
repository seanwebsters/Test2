/**
 * Generative ambient soundscape (WebAudio, no assets).
 *
 *  - "ambience" bed: filtered brown noise with a slow swell (waves / wind / rain)
 *  - "music" bed: a soft detuned pad chord
 *
 * The player drives both levels from the Dream Engine's sleep curve, so music
 * fades out while ambience rises as the listener falls asleep. In production
 * these beds become the partner-approved stems referenced by `soundscape.cues`.
 */
export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noiseGain!: GainNode;
  private padGain!: GainNode;
  private nodes: AudioScheduledSourceNode[] = [];

  start(chord: number[] = [110, 164.81, 220, 277.18]) {
    if (this.ctx) return this.ctx.resume();
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = (this.ctx = new Ctx());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 4);

    // brown noise
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      }
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.25;
    // slow swell like waves
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.09;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.12;
    swell.connect(swellDepth).connect(this.noiseGain.gain);
    noise.connect(lp).connect(this.noiseGain).connect(this.master);

    // pad
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.05;
    const padLp = ctx.createBiquadFilter();
    padLp.type = "lowpass";
    padLp.frequency.value = 900;
    padLp.connect(this.padGain).connect(this.master);
    for (const f of chord) {
      for (const det of [-6, 5]) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.value = 0.18;
        o.connect(g).connect(padLp);
        o.start();
        this.nodes.push(o);
      }
    }
    noise.start();
    swell.start();
    this.nodes.push(noise, swell);
  }

  /** levels 0..1 from the sleep curve */
  setLevels(music: number, ambience: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.padGain.gain.setTargetAtTime(0.012 + music * 0.07, t, 3);
    this.noiseGain.gain.setTargetAtTime(0.08 + ambience * 0.32, t, 3);
  }

  pause() {
    this.ctx?.suspend();
  }
  resume() {
    this.ctx?.resume();
  }
  stop() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
    setTimeout(() => {
      this.nodes.forEach((n) => {
        try {
          n.stop();
        } catch {}
      });
      ctx.close();
    }, 2000);
    this.ctx = null;
    this.nodes = [];
  }
}
