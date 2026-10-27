import type { ConstellationConfig } from "../../lib/engine/schemas";
import { connect, createSky, edgeKey, isSkyComplete, nextEdge, remainingDegree, type SkyState } from "../../lib/engine/constellation";
import { rng, hashString } from "../../lib/engine/rng";
import { rgba } from "../../lib/design-system/color";
import type { Pt, Scene, SceneHost } from "../types";

interface Fading {
  a: string;
  b: string;
  at: number;
}

export function createConstellationScene(config: ConstellationConfig, index: number, host: SceneHost): Scene {
  const level = config.levels[index];
  const { theme } = host;
  const tempo = theme.motionTempo;
  const byId = new Map(level.stars.map((s) => [s.id, s]));
  let sky: SkyState = createSky();
  let area = { x: 0, y: 0, w: 1, h: 1 };
  let box = { x: 0, y: 0, s: 1 };
  let from: string | null = null;
  let pointer: Pt | null = null;
  let dragging = false;
  const fading: Fading[] = [];
  const drawnAt = new Map<string, number>();
  let doneAt = -1;
  let focusIdx = 0;
  let keyboard = false;
  const rand = rng(hashString(level.name));
  const dust = Array.from({ length: 70 }, () => ({ x: rand(), y: rand(), r: 0.3 + rand() * 0.9, p: rand() * 6 }));
  const showDegree = level.hint !== "ghost";
  const showGhost = level.hint !== "degree";

  const pos = (id: string) => {
    const s = byId.get(id)!;
    return { x: box.x + s.x * box.s, y: box.y + s.y * box.s };
  };
  const hitRadius = () => Math.max(24, box.s * 0.045);
  function starAt(p: Pt): string | null {
    let best: string | null = null, bestD = hitRadius();
    for (const s of level.stars) {
      const q = pos(s.id);
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bestD) (best = s.id), (bestD = d);
    }
    return best;
  }

  const status = () => host.hud.setStatus(`${sky.drawn.length} of ${level.edges.length} lines`);
  status();

  function attempt(a: string, b: string) {
    const r = connect(sky, level, a, b);
    sky = r.state;
    const t = host.time();
    if (r.result === "correct") {
      drawnAt.set(edgeKey(a, b), t);
      host.sound.connect();
      const q = pos(b);
      host.burst(q.x, q.y, theme.accent, 10);
      host.track("interaction", { action: "connect", correct: true });
      if (isSkyComplete(sky, level)) {
        doneAt = t;
        host.hud.announce(`${level.name} is complete.`);
        host.levelComplete();
      }
    } else if (r.result === "incorrect") {
      fading.push({ a, b, at: t });
      host.sound.miss();
      host.track("interaction", { action: "connect", correct: false });
    }
    status();
  }

  function drawLine(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, width: number, glow = 0, progress = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.shadowColor = glow ? theme.glow : "transparent";
    ctx.shadowBlur = glow;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  return {
    resize(a) {
      area = a;
      const s = Math.min(a.w, a.h);
      box = { x: a.x + (a.w - s) / 2, y: a.y + (a.h - s) / 2, s };
    },
    draw(ctx, t) {
      for (const d of dust) {
        ctx.fillStyle = rgba(theme.glow, 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(t * 0.8 * tempo + d.p)));
        ctx.beginPath();
        ctx.arc(area.x + d.x * area.w, area.y + d.y * area.h, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      const complete = doneAt >= 0;
      if (showGhost && !complete)
        for (const [a, b] of level.edges) {
          if (sky.drawn.includes(edgeKey(a, b))) continue;
          ctx.setLineDash([3, 9]);
          drawLine(ctx, pos(a), pos(b), rgba(theme.ink, 0.16), 1);
          ctx.setLineDash([]);
        }
      for (const key of sky.drawn) {
        const [a, b] = key.split("~");
        const since = t - (drawnAt.get(key) ?? 0);
        const grow = host.reducedMotion ? 1 : Math.min(1, since / (0.6 / tempo));
        const shine = complete ? 0.5 + 0.5 * Math.sin((t - doneAt) * 1.5 * tempo) : 0;
        drawLine(ctx, pos(a), pos(b), rgba(theme.accent, 0.85), 2.2 + shine, 12 + shine * 10, grow);
      }
      for (let i = fading.length - 1; i >= 0; i--) {
        const f = fading[i];
        const k = 1 - (t - f.at) / 1.1;
        if (k <= 0) {
          fading.splice(i, 1);
          continue;
        }
        drawLine(ctx, pos(f.a), pos(f.b), rgba(theme.ink, 0.35 * k), 1.5);
      }
      if (from && pointer && dragging) drawLine(ctx, pos(from), pointer, rgba(theme.accent, 0.55), 1.8, 6);
      level.stars.forEach((s, i) => {
        const q = pos(s.id);
        const base = (4 - s.mag) * Math.max(1.6, box.s * 0.0045);
        const twinkle = host.reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 2.1 * tempo + i * 1.3);
        const selected = from === s.id;
        const halo = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, base * (selected ? 8 : 5));
        halo.addColorStop(0, rgba(theme.glow, (selected ? 0.75 : 0.45) * twinkle));
        halo.addColorStop(1, rgba(theme.glow, 0));
        ctx.fillStyle = halo;
        ctx.fillRect(q.x - base * 8, q.y - base * 8, base * 16, base * 16);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(q.x, q.y, base * twinkle, 0, Math.PI * 2);
        ctx.fill();
        if (showDegree && !complete) {
          const left = remainingDegree(sky, level, s.id);
          for (let k = 0; k < left; k++) {
            const a = -Math.PI / 2 + (k - (left - 1) / 2) * 0.5;
            ctx.fillStyle = rgba(theme.accent, 0.9);
            ctx.beginPath();
            ctx.arc(q.x + Math.cos(a) * (base + 10), q.y + Math.sin(a) * (base + 10), 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (keyboard && i === focusIdx) {
          ctx.strokeStyle = theme.ink === "#ffffff" ? theme.ink : rgba(theme.glow, 0.9);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(q.x, q.y, base + 16, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    },
    pointerDown(p) {
      keyboard = false;
      const s = starAt(p);
      pointer = p;
      if (!s) {
        from = null;
        return;
      }
      if (from && from !== s) {
        // Tap-tap: second tap completes the line.
        attempt(from, s);
        from = null;
        return;
      }
      from = s;
      dragging = true;
      host.sound.touch(level.stars.findIndex((x) => x.id === s));
    },
    pointerMove(p) {
      pointer = p;
    },
    pointerUp(p) {
      if (!dragging) return;
      dragging = false;
      const s = starAt(p);
      if (from && s && s !== from) {
        attempt(from, s);
        from = null;
      }
    },
    key(e) {
      // Arrow keys move to the nearest star in that direction.
      const dirs: Record<string, Pt> = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
      const d = dirs[e.key];
      if (d) {
        keyboard = true;
        const cur = level.stars[focusIdx];
        let best = focusIdx, bestScore = Infinity;
        level.stars.forEach((s, i) => {
          const dx = s.x - cur.x, dy = s.y - cur.y;
          const along = dx * d.x + dy * d.y;
          if (i === focusIdx || along <= 0.001) return;
          const score = along + Math.abs(dx * d.y + dy * d.x) * 2;
          if (score < bestScore) (bestScore = score), (best = i);
        });
        focusIdx = best;
        return true;
      }
      if (e.key === "Enter" || e.key === " ") {
        keyboard = true;
        const id = level.stars[focusIdx].id;
        if (from && from !== id) {
          attempt(from, id);
          from = null;
        } else from = id;
        return true;
      }
      if (e.key === "Escape") {
        from = null;
        return true;
      }
      return false;
    },
    qaNext() {
      const e = nextEdge(sky, level);
      if (!e) return null;
      return { kind: "drag", from: pos(e[0]), to: pos(e[1]), label: `connect ${e[0]}–${e[1]}` };
    },
    qaState: () => ({ drawn: sky.drawn.length, misses: sky.misses, complete: doneAt >= 0 }),
    progress: () => sky.drawn.length / level.edges.length,
  };
}
