import type { Theme } from "../lib/engine/schemas";
import { mix, rgba } from "../lib/design-system/color";
import { rng } from "../lib/engine/rng";

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

/** Background sky, horizon, ambient particles and reward sparks. */
export function createStage(theme: Theme, opts: { landscape: boolean; reducedMotion: boolean }) {
  const rand = rng(7);
  let w = 0, h = 0;
  let motes: Mote[] = [];
  const sparks: Spark[] = [];
  const tempo = theme.motionTempo;

  function seedMotes() {
    if (theme.particles === "none" || opts.reducedMotion) {
      motes = [];
      return;
    }
    const n = Math.round((theme.particles === "stars" ? 90 : theme.particles === "mist" ? 6 : 36) * (0.3 + theme.particleDensity));
    motes = Array.from({ length: n }, () => ({
      x: rand() * w,
      y: rand() * h,
      vx: (rand() - 0.5) * 8,
      vy: theme.particles === "petals" || theme.particles === "snow" ? 6 + rand() * 10 : theme.particles === "dust" ? -4 - rand() * 6 : (rand() - 0.5) * 6,
      r: theme.particles === "mist" ? 120 + rand() * 160 : theme.particles === "petals" ? 2.5 + rand() * 2.5 : 0.8 + rand() * 1.8,
      phase: rand() * Math.PI * 2,
    }));
  }

  function hills(ctx: CanvasRenderingContext2D, t: number) {
    const layers = [
      { y: 0.7, amp: 0.05, f: 1.3, c: mix(theme.sky.at(-1)!, theme.ground, 0.35), a: 0.55 },
      { y: 0.8, amp: 0.04, f: 2.1, c: mix(theme.sky.at(-1)!, theme.ground, 0.65), a: 0.7 },
      { y: 0.9, amp: 0.03, f: 3.2, c: theme.ground, a: 0.85 },
    ];
    for (const [k, L] of layers.entries()) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 12) {
        const u = x / w;
        const drift = opts.reducedMotion ? 0 : Math.sin(t * 0.02 * tempo + k) * 0.004;
        ctx.lineTo(x, h * (L.y + drift + Math.sin(u * Math.PI * L.f + k * 1.7) * L.amp + Math.sin(u * 13 + k) * 0.006));
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = rgba(L.c, L.a);
      ctx.fill();
    }
  }

  return {
    resize(nw: number, nh: number) {
      w = nw;
      h = nh;
      seedMotes();
    },
    drawBackground(ctx: CanvasRenderingContext2D, t: number) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      theme.sky.forEach((c, i) => g.addColorStop(i / (theme.sky.length - 1), c));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // A low sun or moon: one soft light source anchors every scene.
      const pulse = opts.reducedMotion ? 0 : Math.sin(t * 0.4 * tempo) * 0.02;
      const sx = w * 0.72, sy = h * (opts.landscape ? 0.62 : 0.2);
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * (0.45 + pulse));
      halo.addColorStop(0, rgba(theme.glow, 0.55));
      halo.addColorStop(0.25, rgba(theme.glow, 0.18));
      halo.addColorStop(1, rgba(theme.glow, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);
      if (opts.landscape) hills(ctx, t);
    },
    drawAmbient(ctx: CanvasRenderingContext2D, t: number, dt: number) {
      const step = dt * tempo;
      for (const m of motes) {
        m.x += m.vx * step + (theme.particles === "petals" ? Math.sin(t + m.phase) * 0.3 : 0);
        m.y += m.vy * step;
        if (m.x < -200) m.x = w + 100;
        if (m.x > w + 200) m.x = -100;
        if (m.y < -200) m.y = h + 100;
        if (m.y > h + 200) m.y = -100;
        const tw = 0.5 + 0.5 * Math.sin(t * 1.3 * tempo + m.phase);
        if (theme.particles === "mist") {
          const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
          g.addColorStop(0, rgba(theme.glow, 0.08));
          g.addColorStop(1, rgba(theme.glow, 0));
          ctx.fillStyle = g;
          ctx.fillRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
        } else if (theme.particles === "petals") {
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(t * 0.5 + m.phase);
          ctx.fillStyle = rgba(theme.accentSoft, 0.55);
          ctx.beginPath();
          ctx.ellipse(0, 0, m.r * 1.8, m.r, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = rgba(theme.particles === "snow" ? "#ffffff" : theme.glow, theme.particles === "stars" ? 0.25 + tw * 0.6 : 0.2 + tw * 0.55);
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r * (theme.particles === "fireflies" ? 1 + tw : 1), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt * 0.8;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy -= 6 * dt;
        ctx.fillStyle = rgba(s.color, s.life * 0.8);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5 + s.life * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    burst(x: number, y: number, color = theme.glow, count = 14) {
      if (opts.reducedMotion) count = Math.min(count, 4);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rand();
        const sp = 18 + rand() * 30;
        sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
      }
    },
  };
}
