import type { GardenConfig, Species } from "../../lib/engine/schemas";
import { applyTool, createGarden, flowingChannels, harmonyPairs, isBloom, isMoist, naturallyMoist, neighbours, planGarden, progress, tick, type GardenState, type Tool } from "../../lib/engine/garden";
import { mix, rgba } from "../../lib/design-system/color";
import { ICONS } from "../hud";
import type { Pt, QAAction, Scene, SceneHost } from "../types";

/** Seconds of game time between growth steps at tempo 1. */
export const GROWTH_SECONDS = 2.4;

export function createGardenScene(config: GardenConfig, index: number, host: SceneHost): Scene {
  const level = config.levels[index];
  const { theme } = host;
  const tempo = theme.motionTempo;
  const species = new Map(level.species.map((s) => [s.id, s]));
  let state: GardenState = createGarden(level);
  let tool: Tool = { kind: "plant", species: level.species[0].id };
  let size = 0, ox = 0, oy = 0;
  let nextTick = host.time() + GROWTH_SECONDS / tempo;
  let done = false;
  let focus = state.ground.findIndex((g) => g === "soil");
  let keyboard = false;
  const grownAt = new Map<number, number>();
  const plan = planGarden(level);
  const water = mix(mix(theme.sky.at(-1)!, "#7FA6C4", 0.55), theme.accentSoft, 0.15);

  // ── Toolbar ─────────────────────────────────────────────────────────
  const bar = document.createElement("div");
  bar.style.display = "flex";
  bar.style.gap = "6px";
  const buttons: { el: HTMLButtonElement; tool: Tool }[] = [];
  function addTool(t: Tool, label: string, icon: string, hint: string) {
    const b = document.createElement("button");
    b.className = "tool";
    b.innerHTML = `${icon}<span></span>`;
    b.querySelector("span")!.textContent = label;
    b.setAttribute("aria-label", hint);
    b.dataset.tool = t.kind === "plant" ? `plant:${t.species}` : t.kind;
    b.onclick = () => {
      tool = t;
      host.sound.touch(buttons.findIndex((x) => x.el === b));
      syncTools();
    };
    buttons.push({ el: b, tool: t });
    bar.appendChild(b);
  }
  level.species.forEach((s) => addTool({ kind: "plant", species: s.id }, s.name, `<i style="background:${s.bloom};box-shadow:0 0 0 3px ${rgba(s.leaf, 0.5)}"></i>`, `Plant ${s.name}`));
  addTool({ kind: "water" }, "Water", ICONS.water, "Watering can");
  if (level.channelBudget > 0) addTool({ kind: "channel" }, `Channel`, ICONS.channel, "Dig or fill a water channel");
  const sameTool = (a: Tool, b: Tool) => a.kind === b.kind && (a.kind !== "plant" || (b.kind === "plant" && a.species === b.species));
  function syncTools() {
    for (const { el, tool: t } of buttons) {
      el.setAttribute("aria-pressed", String(sameTool(t, tool)));
      if (t.kind === "channel") el.querySelector("span")!.textContent = `Channel · ${state.channelsLeft}`;
    }
  }
  syncTools();
  host.hud.setToolbar(bar);

  function status() {
    const p = progress(state, level);
    host.hud.setStatus(`${p.blooms}/${level.goalBlooms} in bloom${level.goalHarmonies ? ` · ${p.harmonies}/${level.goalHarmonies} in harmony` : ""}`);
    return p;
  }
  status();

  const cellAt = (p: Pt) => {
    const c = Math.floor((p.x - ox) / size), r = Math.floor((p.y - oy) / size);
    return c < 0 || r < 0 || c >= state.cols || r >= state.rows ? -1 : r * state.cols + c;
  };
  const center = (i: number) => ({ x: ox + ((i % state.cols) + 0.5) * size, y: oy + (Math.floor(i / state.cols) + 0.5) * size });

  function use(i: number) {
    if (i < 0 || done) return;
    const r = applyTool(state, i, tool);
    if (!r.changed) {
      host.sound.miss();
      return;
    }
    state = r.state;
    const c = center(i);
    if (r.effect === "planted") host.burst(c.x, c.y, species.get((tool as { species: string }).species)?.leaf, 8);
    if (r.effect === "watered" || r.effect === "dug") host.burst(c.x, c.y, water, 10);
    host.sound.touch(r.effect === "planted" ? 2 : r.effect === "watered" ? 4 : 1);
    host.track("interaction", { action: r.effect });
    syncTools();
    status();
  }

  function grow() {
    const r = tick(state);
    state = r.state;
    const t = host.time();
    for (const i of r.grew) {
      grownAt.set(i, t);
      if (isBloom(state, state.plants[i])) {
        const c = center(i);
        host.burst(c.x, c.y, species.get(state.plants[i]!.species)?.bloom, 16);
        host.sound.connect();
      }
    }
    const p = status();
    if (p.complete && !done) {
      done = true;
      host.hud.announce("The garden is in full bloom.");
      host.levelComplete();
    }
  }

  // ── Drawing ─────────────────────────────────────────────────────────
  function drawPlant(ctx: CanvasRenderingContext2D, sp: Species, stage: number, x: number, y: number, t: number, i: number) {
    const k = stage / state.stages;
    const s = size;
    const sway = host.reducedMotion ? 0 : Math.sin(t * 1.1 * tempo + i) * 0.06;
    const since = grownAt.get(i);
    const pop = since !== undefined && t - since < 0.6 ? 1 + Math.sin(((t - since) / 0.6) * Math.PI) * 0.12 : 1;
    ctx.save();
    ctx.translate(x, y + s * 0.28);
    ctx.rotate(sway);
    ctx.scale(pop, pop);
    const height = s * (0.12 + k * 0.48);
    ctx.strokeStyle = mix(sp.leaf, theme.ink, 0.2);
    ctx.fillStyle = sp.leaf;
    ctx.lineCap = "round";
    if (stage === 0) {
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.04, s * 0.07, s * 0.045, 0, 0, Math.PI * 2);
      ctx.fillStyle = mix(theme.surface, theme.ink, 0.35);
      ctx.fill();
      ctx.restore();
      return;
    }
    const leaf = (lx: number, ly: number, a: number, len: number) => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(len / 2, 0, len / 2, len * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    if (sp.form === "grass") {
      for (let b = -2; b <= 2; b++) {
        ctx.lineWidth = s * 0.035;
        ctx.beginPath();
        ctx.moveTo(b * s * 0.04, 0);
        ctx.quadraticCurveTo(b * s * 0.08, -height * 0.6, b * s * 0.12, -height);
        ctx.stroke();
      }
    } else if (sp.form === "tree") {
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -height * 0.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -height * 0.8, s * (0.08 + k * 0.17), 0, Math.PI * 2);
      ctx.fill();
    } else if (sp.form === "shrub" || sp.form === "succulent") {
      const n = sp.form === "succulent" ? 7 : 5;
      for (let l = 0; l < n; l++) leaf(0, -s * 0.02, -Math.PI / 2 + ((l - (n - 1) / 2) / n) * 2.4, s * (0.1 + k * 0.22));
    } else if (sp.form === "lotus") {
      ctx.beginPath();
      ctx.ellipse(0, 0, s * (0.12 + k * 0.14), s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = s * 0.03;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 0.04, -height / 2, 0, -height);
      ctx.stroke();
      leaf(0, -height * 0.35, -0.6, s * (0.08 + k * 0.1));
      leaf(0, -height * 0.55, Math.PI + 0.6, s * (0.08 + k * 0.1));
    }
    if (stage >= state.stages - 1) {
      const top = sp.form === "tree" ? -height * 0.85 : sp.form === "lotus" ? -s * 0.06 : sp.form === "grass" ? -height : -height;
      const open = stage >= state.stages ? 1 : 0.35;
      const petals = sp.form === "lotus" ? 8 : 6;
      const pr = s * (0.05 + open * 0.07);
      if (open === 1) {
        const g = ctx.createRadialGradient(0, top, 0, 0, top, s * 0.4);
        g.addColorStop(0, rgba(sp.bloom, 0.35));
        g.addColorStop(1, rgba(sp.bloom, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-s * 0.4, top - s * 0.4, s * 0.8, s * 0.8);
      }
      ctx.fillStyle = sp.bloom;
      for (let pI = 0; pI < petals; pI++) {
        const a = (pI / petals) * Math.PI * 2 + t * 0.05;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * pr * 0.8, top + Math.sin(a) * pr * 0.8, pr * 0.75, pr * 0.42, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = mix(sp.bloom, "#ffffff", 0.55);
      ctx.beginPath();
      ctx.arc(0, top, pr * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return {
    resize(a) {
      size = Math.floor(Math.min(a.w / state.cols, a.h / state.rows, 110));
      ox = a.x + (a.w - size * state.cols) / 2;
      oy = a.y + (a.h - size * state.rows) / 2;
    },
    update(t) {
      while (t >= nextTick && !done) {
        nextTick += GROWTH_SECONDS / tempo;
        grow();
      }
    },
    draw(ctx, t) {
      const natural = naturallyMoist(state);
      const flowing = flowingChannels(state);
      const s = size;
      // Garden bed
      ctx.beginPath();
      ctx.roundRect(ox - s * 0.15, oy - s * 0.15, state.cols * s + s * 0.3, state.rows * s + s * 0.3, s * 0.35);
      ctx.fillStyle = rgba(mix(theme.ground, theme.ink, 0.1), 0.55);
      ctx.shadowColor = rgba(theme.ink, 0.25);
      ctx.shadowBlur = s * 0.5;
      ctx.fill();
      ctx.shadowColor = "transparent";
      state.ground.forEach((g, i) => {
        const { x, y } = center(i);
        const half = s / 2 - s * 0.05;
        ctx.beginPath();
        ctx.roundRect(x - half, y - half, half * 2, half * 2, s * 0.22);
        if (g === "stone") {
          ctx.fillStyle = mix(theme.surface, "#8C8577", 0.5);
          ctx.fill();
          ctx.fillStyle = rgba("#ffffff", 0.15);
          ctx.beginPath();
          ctx.ellipse(x - s * 0.1, y - s * 0.08, s * 0.16, s * 0.1, -0.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (g === "water" || g === "channel") {
          const live = g === "water" || flowing.has(i);
          ctx.fillStyle = live ? water : mix(theme.ground, water, 0.35);
          ctx.fill();
          const ripple = host.reducedMotion ? 0.5 : (t * 0.5 * tempo + i * 0.37) % 1;
          ctx.strokeStyle = rgba("#ffffff", live ? 0.45 * (1 - ripple) : 0.12);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(x, y, s * (0.1 + ripple * 0.28), s * (0.05 + ripple * 0.14), 0, 0, Math.PI * 2);
          ctx.stroke();
          if (g === "channel")
            for (const j of neighbours(state, i)) {
              if (state.ground[j] !== "water" && state.ground[j] !== "channel") continue;
              const n = center(j);
              ctx.strokeStyle = live ? water : mix(theme.ground, water, 0.35);
              ctx.lineWidth = s * 0.3;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo((x + n.x) / 2, (y + n.y) / 2);
              ctx.stroke();
            }
        } else {
          const moist = isMoist(state, i, natural);
          ctx.fillStyle = moist ? mix(theme.surface, theme.ink, 0.22) : theme.surface;
          ctx.fill();
          if (moist) {
            ctx.strokeStyle = rgba(water, 0.6);
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      });
      for (const [a, b] of harmonyPairs(state, level.companions)) {
        const p = center(a), q = center(b);
        ctx.strokeStyle = rgba(theme.glow, 0.55 + Math.sin(t * 2 * tempo) * 0.2);
        ctx.lineWidth = 3;
        ctx.setLineDash([2, 8]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s * 0.2);
        ctx.lineTo(q.x, q.y - s * 0.2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      state.plants.forEach((p, i) => {
        if (!p) return;
        const { x, y } = center(i);
        drawPlant(ctx, species.get(p.species)!, p.stage, x, y, t, i);
      });
      if (keyboard && focus >= 0) {
        const { x, y } = center(focus);
        ctx.strokeStyle = theme.ink;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.roundRect(x - s / 2 + 2, y - s / 2 + 2, s - 4, s - 4, s * 0.22);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    pointerDown(p) {
      keyboard = false;
      use(cellAt(p));
    },
    key(e) {
      const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (moves[e.key]) {
        keyboard = true;
        const c = (focus % state.cols) + moves[e.key][0], r = Math.floor(focus / state.cols) + moves[e.key][1];
        if (c >= 0 && r >= 0 && c < state.cols && r < state.rows) focus = r * state.cols + c;
        return true;
      }
      if (e.key === "Enter" || e.key === " ") {
        keyboard = true;
        use(focus);
        return true;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= buttons.length) {
        buttons[n - 1].el.click();
        return true;
      }
      return false;
    },
    qaNext(): QAAction | null {
      if (!plan || done) return null;
      const press = (t: Tool, label: string): QAAction => {
        const b = buttons.find((x) => sameTool(x.tool, t))!.el.getBoundingClientRect();
        return { kind: "click", x: b.left + b.width / 2, y: b.top + b.height / 2, label };
      };
      const cell = (i: number, label: string): QAAction => ({ kind: "click", ...center(i), label });
      for (const { index: i, species: sp } of plan.cells) {
        if (state.plants[i]) continue;
        const want: Tool = { kind: "plant", species: sp };
        return sameTool(tool, want) ? cell(i, `plant ${sp}`) : press(want, `choose ${sp}`);
      }
      const natural = naturallyMoist(state);
      const dry = plan.cells.find(({ index: i }) => !isBloom(state, state.plants[i]) && !isMoist(state, i, natural));
      if (dry) return tool.kind === "water" ? cell(dry.index, "water") : press({ kind: "water" }, "choose water");
      return { kind: "advance", ms: (GROWTH_SECONDS / tempo) * 1000, label: "let the garden grow" };
    },
    qaState: () => ({ ...progress(state, level), tick: state.tick, planted: state.plants.filter(Boolean).length }),
    progress: () => Math.min(1, progress(state, level).blooms / level.goalBlooms),
  };
}
