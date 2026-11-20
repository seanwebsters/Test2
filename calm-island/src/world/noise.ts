import { mulberry32 } from '../core/math';

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GX = [1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0];
const GY = [1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1];

/** Seeded 2D simplex noise with fbm / ridged helpers. Output roughly in [-1, 1]. */
export class Noise2D {
  private perm = new Uint8Array(512);
  private perm12 = new Uint8Array(512);

  constructor(seed: number) {
    const rnd = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.perm12[i] = this.perm[i] % 12;
    }
  }

  simplex(xin: number, yin: number): number {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = 1 - i1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let n = 0;
    let a = 0.5 - x0 * x0 - y0 * y0;
    if (a > 0) {
      const g = this.perm12[ii + this.perm[jj]];
      a *= a;
      n += a * a * (GX[g] * x0 + GY[g] * y0);
    }
    a = 0.5 - x1 * x1 - y1 * y1;
    if (a > 0) {
      const g = this.perm12[ii + i1 + this.perm[jj + j1]];
      a *= a;
      n += a * a * (GX[g] * x1 + GY[g] * y1);
    }
    a = 0.5 - x2 * x2 - y2 * y2;
    if (a > 0) {
      const g = this.perm12[ii + 1 + this.perm[jj + 1]];
      a *= a;
      n += a * a * (GX[g] * x2 + GY[g] * y2);
    }
    return 70 * n;
  }

  fbm(x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
    let amp = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.simplex(x, y);
      norm += amp;
      amp *= gain;
      x = x * lacunarity + 17.13;
      y = y * lacunarity - 9.71;
    }
    return sum / norm;
  }

  /** Ridged multifractal in [0, 1]; sharp crests, good for mountains. */
  ridged(x: number, y: number, octaves = 4): number {
    let amp = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      const r = 1 - Math.abs(this.simplex(x, y));
      sum += amp * r * r;
      norm += amp;
      amp *= 0.5;
      x = x * 2.1 + 31.7;
      y = y * 2.1 + 11.3;
    }
    return sum / norm;
  }
}
