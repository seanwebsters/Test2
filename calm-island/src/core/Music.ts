/**
 * Looping background music through Web Audio. Decoding into a buffer (rather
 * than an <audio> tag) gives a seamless loop. Browsers only allow sound after
 * a click or key press, so `start()` is called from the Play button.
 */
export class Music {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private started = false;
  private volume = 0.6;
  private ducked = false;
  private resting = false;

  constructor(private url: string) {}

  /** Sound is actually coming out (the browser has allowed it). */
  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  async start(): Promise<void> {
    if (this.started) {
      void this.ctx?.resume();
      return;
    }
    this.started = true;
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      // soften the top end a little; the track is a gentle bed, not a lead
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 6500;
      filter.connect(gain).connect(ctx.destination);
      this.gain = gain;
      const data = await (await fetch(this.url)).arrayBuffer();
      const buffer = await ctx.decodeAudioData(data);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(filter);
      src.start();
      this.apply(3);
    } catch (err) {
      console.info('Music unavailable:', err);
    }
  }

  setVolume(v: number): void {
    this.volume = v;
    this.apply(0.25);
  }

  /** Quieter while the menu is open. */
  duck(on: boolean): void {
    this.ducked = on;
    this.apply(0.8);
  }

  /** Let the music fall silent for a while, or bring it back, over several seconds. */
  rest(on: boolean): void {
    if (this.resting === on) return;
    this.resting = on;
    this.apply(7);
  }

  private apply(seconds: number): void {
    if (!this.ctx || !this.gain) return;
    const target = this.volume * this.volume * (this.ducked ? 0.35 : 1) * (this.resting ? 0 : 1);
    this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.gain.gain.setTargetAtTime(target, this.ctx.currentTime, seconds / 3);
  }
}
