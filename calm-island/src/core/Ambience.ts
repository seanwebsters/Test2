/**
 * The island's sound, made entirely in Web Audio: wind, running water, the
 * waterfall, rain, birdsong by day and crickets at night. Nothing is recorded;
 * every layer is shaped noise or a few sine chirps, mixed by where you stand.
 */
export interface AmbienceMix {
  /** 0..1 closeness to the sea, a lake or the river */
  water: number;
  /** 0..1 closeness to the waterfall */
  falls: number;
  /** 0..1, higher up means more wind */
  height: number;
  night: number;
  rain: number;
  /** 0..1 how wooded it is here */
  trees: number;
}

export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wind: GainNode | null = null;
  private water: GainNode | null = null;
  private falls: GainNode | null = null;
  private rain: GainNode | null = null;
  private volume = 0.6;
  private ducked = false;
  private nextChirp = 0;
  /** how many bird or cricket calls have been scheduled (for tests) */
  calls = 0;

  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      this.master = master;
      // one long loop of soft noise feeds every layer
      const len = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = last * 0.6 + (Math.random() * 2 - 1) * 0.4;
        d[i] = last;
      }
      const layer = (type: BiquadFilterType, freq: number, q: number, rate: number): GainNode => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.playbackRate.value = rate;
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        const g = ctx.createGain();
        g.gain.value = 0;
        src.connect(f).connect(g).connect(master);
        src.start(0, Math.random() * 3);
        return g;
      };
      this.wind = layer('bandpass', 420, 0.5, 0.55);
      this.water = layer('bandpass', 1500, 0.4, 1.0);
      this.falls = layer('lowpass', 900, 0.3, 0.8);
      this.rain = layer('highpass', 2600, 0.3, 1.3);
      this.apply();
    } catch (err) {
      console.info('Ambient sound unavailable:', err);
    }
  }

  setVolume(v: number): void {
    this.volume = v;
    this.apply();
  }

  duck(on: boolean): void {
    this.ducked = on;
    this.apply();
  }

  private apply(): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(this.volume * this.volume * (this.ducked ? 0.3 : 1), this.ctx.currentTime, 0.4);
  }

  update(mix: AmbienceMix, time: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.wind || !this.water || !this.falls || !this.rain || !this.master) return;
    const now = ctx.currentTime;
    const set = (g: GainNode, v: number): void => {
      g.gain.setTargetAtTime(v, now, 0.5);
    };
    // the wind breathes: gusts come and go, stronger on high ground
    const gust = 0.55 + 0.45 * Math.sin(time * 0.31) * Math.sin(time * 0.13 + 1);
    set(this.wind, (0.05 + 0.16 * mix.height) * gust * (1 - mix.trees * 0.4));
    set(this.water, 0.11 * mix.water);
    set(this.falls, 0.5 * mix.falls * mix.falls);
    set(this.rain, 0.16 * mix.rain);

    if (time < this.nextChirp || mix.rain > 0.5) return;
    if (mix.night > 0.6) {
      this.cricket(now);
      this.nextChirp = time + 0.9 + Math.random() * 1.6;
    } else if (mix.night < 0.3) {
      this.bird(now);
      this.nextChirp = time + (2.2 + Math.random() * 5) / (0.6 + mix.trees);
    } else {
      this.nextChirp = time + 2;
    }
    this.calls++;
  }

  /** A short run of falling or rising chirps, panned somewhere around you. */
  private bird(now: number): void {
    const ctx = this.ctx!;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(this.master!);
    const base = 2200 + Math.random() * 2400;
    const notes = 2 + Math.floor(Math.random() * 4);
    const up = Math.random() < 0.5;
    const loud = 0.03 + Math.random() * 0.05;
    for (let i = 0; i < notes; i++) {
      const t = now + i * (0.09 + Math.random() * 0.05);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = base * (1 + (up ? i : -i) * 0.06);
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * (up ? 1.25 : 0.8), t + 0.07);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(loud, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.085);
      o.connect(g).connect(pan);
      o.start(t);
      o.stop(t + 0.1);
    }
  }

  private cricket(now: number): void {
    const ctx = this.ctx!;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.8 - 0.9;
    pan.connect(this.master!);
    const f = 3900 + Math.random() * 700;
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
      const t = now + i * 0.055;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.022, t + 0.008);
      g.gain.linearRampToValueAtTime(0, t + 0.035);
      o.connect(g).connect(pan);
      o.start(t);
      o.stop(t + 0.04);
    }
  }

  /** A few rising bell notes, for the moment fog lifts. */
  chime(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      const t = now + i * 0.16;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 2.2);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 2.3);
    });
  }

  /** A small watery plip, for skimming stones. */
  plip(strength: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(520 + strength * 380, now);
    o.frequency.exponentialRampToValueAtTime(180, now + 0.12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.14, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.16);
    o.connect(g).connect(this.master);
    o.start(now);
    o.stop(now + 0.18);
  }
}
