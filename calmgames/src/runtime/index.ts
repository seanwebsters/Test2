import type { GameConfig } from "../lib/engine/schemas";
import { createAudio } from "./audio";
import { createStage } from "./stage";
import { createHud, hudStyles } from "./hud";
import type { QAAction, Scene, SceneHost } from "./types";
import { createTileScene } from "./scenes/tile";
import { createGardenScene } from "./scenes/garden";
import { createConstellationScene } from "./scenes/constellation";

/**
 * Calm game runtime. Runs inside a sandboxed, opaque-origin iframe and talks
 * to the studio only through postMessage. It reads its configuration from an
 * inline JSON block and needs no network access.
 */

type Phase = "intro" | "playing" | "between" | "finished";

const errors: string[] = [];
const post = (msg: Record<string, unknown>) => {
  try {
    window.parent?.postMessage({ source: "calm-game", ...msg }, "*");
  } catch {
    /* no parent */
  }
};
window.addEventListener("error", (e) => {
  errors.push(String(e.message || e.error));
  post({ type: "event", name: "error", data: { message: String(e.message) } });
});
window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));

function boot() {
  const raw = document.getElementById("calm-config")?.textContent;
  if (!raw) throw new Error("Missing game configuration");
  const config = JSON.parse(raw) as GameConfig;
  const emblem = document.getElementById("calm-emblem")?.textContent?.trim() || undefined;
  const theme = config.theme;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  const style = document.createElement("style");
  style.textContent = hudStyles(theme);
  document.head.appendChild(style);
  document.title = config.title;

  const canvas = document.createElement("canvas");
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "application");
  canvas.setAttribute("aria-label", `${config.title}. ${config.intro}`);
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const hud = createHud(document.body, config.title);
  const audio = createAudio(theme);
  const stage = createStage(theme, { landscape: config.archetype !== "constellation", reducedMotion });

  let phase: Phase = "intro";
  let levelIndex = 0;
  let scene: Scene | null = null;
  let paused = false;
  let gameTime = 0;
  let last = performance.now();
  let w = 0, h = 0;
  const startedAt = Date.now();
  let levelStartedAt = 0;

  const host: SceneHost = {
    theme,
    reducedMotion,
    time: () => gameTime,
    sound: audio,
    hud: { setStatus: hud.setStatus, announce: hud.announce, setToolbar: (el) => (hud.setToolbar(el), layout()) },
    burst: (x, y, c, n) => stage.burst(x, y, c, n),
    levelComplete: () => onLevelComplete(),
    track: (name, data) => post({ type: "event", name, level: levelIndex, data }),
  };

  function makeScene(i: number): Scene {
    if (config.archetype === "tile-path") return createTileScene(config, i, host);
    if (config.archetype === "garden") return createGardenScene(config, i, host);
    return createConstellationScene(config, i, host);
  }

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stage.resize(w, h);
    const chrome = hud.chromeHeights();
    const pad = Math.max(12, Math.min(w, h) * 0.04);
    scene?.resize({ x: pad, y: chrome.top, w: w - pad * 2, h: h - chrome.top - chrome.bottom - pad * 0.5 });
  }

  function startLevel(i: number) {
    if (i < 0 || i >= config.levels.length) return;
    levelIndex = i;
    scene = makeScene(i);
    phase = "playing";
    levelStartedAt = Date.now();
    hud.setLevel(`${config.levels.length > 1 ? `Level ${i + 1} of ${config.levels.length} · ` : ""}${config.levels[i].name}`);
    hud.note(config.levels[i].note);
    layout();
    hud.announce(`${config.levels[i].name}. ${config.levels[i].note}`);
    post({ type: "event", name: "level_start", level: i });
    canvas.focus({ preventScroll: true });
  }

  function onLevelComplete() {
    if (phase !== "playing") return;
    audio.complete();
    stage.burst(w / 2, h / 2, theme.accent, 36);
    post({ type: "event", name: "level_complete", level: levelIndex, data: { ms: Date.now() - levelStartedAt } });
    const lastLevel = levelIndex === config.levels.length - 1;
    phase = lastLevel ? "finished" : "between";
    const level = config.levels[levelIndex];
    const story = "story" in level ? (level as { story: string }).story : "";
    setTimeout(
      () => {
        if (lastLevel) {
          post({ type: "event", name: "game_complete", data: { ms: Date.now() - startedAt } });
          hud.showCard({ kicker: "Complete", title: config.title, body: [story, config.completion].filter(Boolean).join(" "), action: "Play again", emblem, onAction: () => restartGame() });
        } else {
          const next = levelIndex + 1;
          hud.showCard({ kicker: `Level ${next} complete`, title: level.name, body: story || "Take a breath. When you're ready, continue.", action: "Continue", onAction: () => startLevel(next) });
        }
        hud.announce(lastLevel ? `${config.title} complete.` : `${level.name} complete.`);
      },
      reducedMotion ? 300 : 1400,
    );
  }

  function restartGame() {
    post({ type: "event", name: "restart", level: levelIndex, data: { scope: "game" } });
    hud.hideCard();
    startLevel(0);
  }

  hud.restartButton.onclick = () => {
    if (phase !== "playing") return;
    post({ type: "event", name: "restart", level: levelIndex, data: { scope: "level" } });
    startLevel(levelIndex);
  };

  // ── Input ───────────────────────────────────────────────────────────
  const pt = (e: PointerEvent) => ({ x: e.clientX, y: e.clientY });
  canvas.addEventListener("pointerdown", (e) => {
    if (paused || phase !== "playing") return;
    canvas.setPointerCapture?.(e.pointerId);
    scene?.pointerDown?.(pt(e));
  });
  canvas.addEventListener("pointermove", (e) => !paused && phase === "playing" && scene?.pointerMove?.(pt(e)));
  canvas.addEventListener("pointerup", (e) => !paused && phase === "playing" && scene?.pointerUp?.(pt(e)));
  window.addEventListener("keydown", (e) => {
    if (paused || phase !== "playing" || hud.cardVisible()) return;
    if (e.key === "r" || e.key === "R") return hud.restartButton.click();
    if (scene?.key?.(e)) e.preventDefault();
  });
  window.addEventListener("resize", layout);

  // ── Studio bridge ───────────────────────────────────────────────────
  window.addEventListener("message", (e) => {
    const m = e.data as { type?: string; on?: boolean } | null;
    if (!m || typeof m.type !== "string") return;
    if (m.type === "calm:pause") paused = true;
    if (m.type === "calm:resume") (paused = false), (last = performance.now());
    if (m.type === "calm:restart") restartGame();
    if (m.type === "calm:sound") audio.setEnabled(!!m.on);
    post({ type: "state", paused, sound: audio.enabled, phase, level: levelIndex });
  });

  // ── Loop ────────────────────────────────────────────────────────────
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused) gameTime += dt;
    stage.drawBackground(ctx, gameTime);
    if (scene) {
      if (!paused && phase === "playing") scene.update?.(gameTime);
      scene.draw(ctx, gameTime, paused ? 0 : dt);
    }
    stage.drawAmbient(ctx, gameTime, paused ? 0 : dt);
    if (paused) {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(0, 0, w, h);
    }
    requestAnimationFrame(frame);
  }

  // ── QA hooks (read by the studio's Playwright checks) ────────────────
  const qa = {
    ready: true,
    archetype: config.archetype,
    errors,
    levelCount: config.levels.length,
    get levelIndex() {
      return levelIndex;
    },
    get phase() {
      return phase;
    },
    state: () => ({ phase, levelIndex, paused, progress: scene?.progress() ?? 0, ...(scene?.qaState() ?? {}) }),
    next(): QAAction | null {
      const btn = hud.cardButton();
      if (btn) {
        const r = btn.getBoundingClientRect();
        return { kind: "click", x: r.left + r.width / 2, y: r.top + r.height / 2, label: btn.textContent ?? "card" };
      }
      if (phase !== "playing") return null;
      return scene?.qaNext() ?? null;
    },
    advance(ms: number) {
      gameTime += ms / 1000;
      scene?.update?.(gameTime);
    },
  };
  (window as unknown as { __calmQA: typeof qa }).__calmQA = qa;

  layout();
  requestAnimationFrame(frame);
  hud.showCard({
    kicker: config.subtitle,
    title: config.title,
    body: config.intro,
    action: "Begin",
    emblem,
    onAction: () => {
      audio.touch(0);
      post({ type: "event", name: "session_start" });
      startLevel(0);
    },
  });
  post({ type: "ready", title: config.title, levels: config.levels.length });
}

try {
  boot();
} catch (e) {
  errors.push(String(e));
  document.body.innerHTML = `<p style="font:15px system-ui;padding:24px">This game could not start: ${String(e).replace(/</g, "&lt;")}</p>`;
  (window as unknown as { __calmQA: unknown }).__calmQA = { ready: false, errors };
}
