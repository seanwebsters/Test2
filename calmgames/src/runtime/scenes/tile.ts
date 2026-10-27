import type { TileConfig } from "../../lib/engine/schemas";
import { buildBoard, DIR_BITS, DIR_STEP, effectiveMask, isRotatable, isSolved, litCells, nextSolutionClick, rotateCell, type TileBoard } from "../../lib/engine/tile";
import { hashString } from "../../lib/engine/rng";
import { mix, rgba } from "../../lib/design-system/color";
import type { Pt, Scene, SceneHost } from "../types";

export function createTileScene(config: TileConfig, index: number, host: SceneHost): Scene {
  const level = config.levels[index];
  const { theme } = host;
  let board: TileBoard = buildBoard(level, hashString(`${config.title}:${index}`));
  let lit = litCells(board);
  let solved = false;
  /** Displayed angle per cell, eased toward its real rotation. */
  const angle = board.cells.map((c) => c.rot * (Math.PI / 2));
  const litAt = new Map<number, number>();
  let size = 0, ox = 0, oy = 0;
  let focus = board.cells.findIndex(isRotatable);
  let keyboard = false;
  const tempo = theme.motionTempo;

  const status = () => host.hud.setStatus(solved ? `The ${config.flowLabel} has arrived` : `${Math.min(lit.size, level.path.length) - 1} of ${level.path.length - 1} lit`);
  status();

  function cellAt(p: Pt): number {
    const c = Math.floor((p.x - ox) / size), r = Math.floor((p.y - oy) / size);
    if (c < 0 || r < 0 || c >= board.cols || r >= board.rows) return -1;
    return r * board.cols + c;
  }
  const center = (i: number) => ({ x: ox + ((i % board.cols) + 0.5) * size, y: oy + (Math.floor(i / board.cols) + 0.5) * size });

  function rotate(i: number) {
    if (solved || !isRotatable(board.cells[i])) return;
    board = rotateCell(board, i);
    const before = lit.size;
    lit = litCells(board);
    const t = host.time();
    for (const j of lit) if (!litAt.has(j)) litAt.set(j, t);
    for (const j of [...litAt.keys()]) if (!lit.has(j)) litAt.delete(j);
    host.sound.touch(lit.size);
    if (lit.size > before) host.sound.connect();
    host.track("interaction", { action: "rotate", moves: board.moves });
    if (isSolved(board)) {
      solved = true;
      const c = center(board.target);
      host.burst(c.x, c.y, theme.accent, 30);
      host.hud.announce(`The ${config.flowLabel} reaches the ${config.targetLabel}.`);
      host.levelComplete();
    }
    status();
  }

  function drawTile(ctx: CanvasRenderingContext2D, i: number, t: number) {
    const cell = board.cells[i];
    const { x, y } = center(i);
    const s = size;
    const inset = s * 0.06, r = s * 0.18;
    const isLit = lit.has(i);
    // Plate
    if (cell.kind !== "empty") {
      ctx.beginPath();
      ctx.roundRect(x - s / 2 + inset, y - s / 2 + inset, s - inset * 2, s - inset * 2, r);
      const plate = ctx.createLinearGradient(x, y - s / 2, x, y + s / 2);
      plate.addColorStop(0, mix(theme.surface, "#ffffff", 0.18));
      plate.addColorStop(1, theme.surface);
      ctx.fillStyle = plate;
      ctx.shadowColor = rgba(theme.ink, 0.18);
      ctx.shadowBlur = s * 0.12;
      ctx.shadowOffsetY = s * 0.04;
      ctx.fill();
      ctx.shadowColor = "transparent";
      if (isLit) {
        ctx.fillStyle = rgba(theme.glow, 0.18);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = rgba(theme.surface, 0.18);
      ctx.beginPath();
      ctx.arc(x, y, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // Connectors, drawn at rotation 0 and turned by the eased angle.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle[i]);
    const width = s * (isLit ? 0.2 : 0.16);
    ctx.lineCap = "round";
    ctx.lineWidth = width;
    ctx.strokeStyle = isLit ? theme.accent : rgba(mix(theme.surface, theme.ink, 0.45), 0.55);
    if (isLit) {
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = s * 0.35;
    }
    ctx.beginPath();
    for (let d = 0; d < 4; d++) {
      if (!(cell.mask & DIR_BITS[d])) continue;
      ctx.moveTo(0, 0);
      ctx.lineTo((DIR_STEP[d][0] * s) / 2, (DIR_STEP[d][1] * s) / 2);
    }
    ctx.stroke();
    if (isLit) {
      // A slow travelling shimmer shows the direction of flow.
      ctx.shadowBlur = 0;
      ctx.setLineDash([s * 0.08, s * 0.22]);
      ctx.lineDashOffset = -t * s * 0.35 * tempo;
      ctx.lineWidth = width * 0.35;
      ctx.strokeStyle = rgba("#ffffff", 0.65);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    // Source and destination emblems
    if (cell.kind === "source" || cell.kind === "target") {
      const on = cell.kind === "source" || isLit;
      const pulse = host.reducedMotion ? 0 : Math.sin(t * 1.6 * tempo) * 0.04;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s * 0.6);
      g.addColorStop(0, rgba(theme.glow, on ? 0.9 : 0.15));
      g.addColorStop(1, rgba(theme.glow, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - s, y - s, s * 2, s * 2);
      ctx.beginPath();
      ctx.arc(x, y, s * (0.2 + pulse), 0, Math.PI * 2);
      ctx.fillStyle = on ? theme.accent : mix(theme.surface, theme.ink, 0.3);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba("#ffffff", on ? 0.8 : 0.3);
      ctx.stroke();
    }
    const since = litAt.get(i);
    if (since !== undefined && t - since < 0.8) {
      ctx.strokeStyle = rgba(theme.glow, 1 - (t - since) / 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, s * (0.3 + (t - since) * 0.4), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPacer(ctx: CanvasRenderingContext2D, t: number) {
    const cycle = 10 / tempo; // 4s in, 6s out
    const u = (t % cycle) / cycle;
    const inhale = u < 0.4;
    const k = inhale ? Math.sin((u / 0.4) * (Math.PI / 2)) : Math.cos(((u - 0.4) / 0.6) * (Math.PI / 2));
    const x = ox + board.cols * size + Math.min(54, size * 0.7), y = oy + size * 0.6;
    const fitsRight = x + 40 < window.innerWidth;
    const px = fitsRight ? x : ox + size * 0.6, py = fitsRight ? y : oy - 28;
    ctx.beginPath();
    ctx.arc(px, py, 10 + k * 14, 0, Math.PI * 2);
    ctx.fillStyle = rgba(theme.glow, 0.25 + k * 0.35);
    ctx.fill();
    ctx.fillStyle = rgba(theme.ink, 0.7);
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText(inhale ? "breathe in" : "breathe out", px, py + 40);
  }

  return {
    resize(a) {
      size = Math.floor(Math.min(a.w / board.cols, a.h / board.rows, 120));
      ox = a.x + (a.w - size * board.cols) / 2;
      oy = a.y + (a.h - size * board.rows) / 2;
    },
    draw(ctx, t, dt) {
      const ease = 1 - Math.pow(0.0001, dt * 1.6 * tempo);
      board.cells.forEach((c, i) => {
        const target = c.rot * (Math.PI / 2);
        // Always turn clockwise toward the target, never the long way round.
        while (target < angle[i] - 0.001) angle[i] -= Math.PI * 2;
        angle[i] = host.reducedMotion ? target : angle[i] + (target - angle[i]) * ease;
      });
      for (let i = 0; i < board.cells.length; i++) drawTile(ctx, i, t);
      if (keyboard && focus >= 0) {
        const { x, y } = center(focus);
        ctx.strokeStyle = theme.ink;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.roundRect(x - size / 2 + 2, y - size / 2 + 2, size - 4, size - 4, size * 0.2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (config.breathPacer) drawPacer(ctx, t);
    },
    pointerDown(p) {
      keyboard = false;
      const i = cellAt(p);
      if (i >= 0) rotate(i);
    },
    key(e) {
      const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (moves[e.key]) {
        keyboard = true;
        const c = (focus % board.cols) + moves[e.key][0], r = Math.floor(focus / board.cols) + moves[e.key][1];
        if (c >= 0 && r >= 0 && c < board.cols && r < board.rows) focus = r * board.cols + c;
        host.sound.touch(0);
        return true;
      }
      if (e.key === "Enter" || e.key === " ") {
        keyboard = true;
        rotate(focus);
        return true;
      }
      return false;
    },
    qaNext() {
      const i = nextSolutionClick(board);
      if (i < 0) return null;
      const { x, y } = center(i);
      return { kind: "click", x, y, label: `rotate tile ${i}` };
    },
    qaState: () => ({ lit: lit.size, moves: board.moves, solved }),
    progress: () => Math.min(1, (lit.size - 1) / (level.path.length - 1)),
  };
}
