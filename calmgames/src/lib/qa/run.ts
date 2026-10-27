import "server-only";
import type { Browser, Page } from "playwright";
import { GAME_CSP } from "../engine/compile";
import type { QACheck, QAReport } from "../types";

const GAME_URL = "https://calm-qa.invalid/game.html";
const DESKTOP = { width: 1200, height: 750 };
const MOBILE = { width: 390, height: 844 };
const REQUIRED = new Set(["boot", "render", "console", "network", "gameplay", "keyboard", "responsive", "controls"]);

type Action = { kind: "click"; x: number; y: number; label: string } | { kind: "drag"; from: { x: number; y: number }; to: { x: number; y: number }; label: string } | { kind: "advance"; ms: number; label: string };
type QAWindow = Window & {
  __calmQA?: { ready: boolean; archetype: string; levelCount: number; errors: string[]; phase?: string; next(): Action | null; state(): Record<string, unknown>; advance?(ms: number): void };
};

async function launch(): Promise<Browser> {
  const { chromium } = await import("playwright");
  try {
    return await chromium.launch();
  } catch {
    // Fall back to the image's preinstalled browser when Playwright's own build is absent.
    return await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  }
}

async function openGame(browser: Browser, html: string, viewport: { width: number; height: number }, sink: { console: string[]; blocked: string[] }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 500, isMobile: viewport.width < 500 });
  const page = await context.newPage();
  await page.route("**/*", (route) => {
    if (route.request().url() === GAME_URL) return route.fulfill({ status: 200, contentType: "text/html", headers: { "Content-Security-Policy": GAME_CSP }, body: html });
    sink.blocked.push(route.request().url());
    return route.abort();
  });
  page.on("console", (m) => m.type() === "error" && !/Content Security Policy|net::ERR_FAILED/.test(m.text()) && sink.console.push(m.text()));
  page.on("pageerror", (e) => sink.console.push(process.env.QA_DEBUG ? `${e.message} ${e.stack}` : e.message));
  await page.goto(GAME_URL, { waitUntil: "load", timeout: 15000 });
  await page.waitForFunction(() => (window as QAWindow).__calmQA !== undefined, null, { timeout: 8000 });
  return page;
}

async function perform(page: Page, a: Action) {
  if (a.kind === "click") await page.mouse.click(a.x, a.y);
  else if (a.kind === "drag") {
    await page.mouse.move(a.from.x, a.from.y);
    await page.mouse.down();
    await page.mouse.move(a.to.x, a.to.y, { steps: 8 });
    await page.mouse.up();
  } else await page.evaluate((ms) => (window as QAWindow).__calmQA!.advance!(ms), a.ms);
}

const qaState = (page: Page) => page.evaluate(() => JSON.stringify((window as QAWindow).__calmQA!.state()));
const nextAction = (page: Page) => page.evaluate(() => (window as QAWindow).__calmQA!.next());

/** Press the title card's Begin button like a player would. */
async function begin(page: Page) {
  const a = await nextAction(page);
  if (a?.kind === "click") await perform(page, a);
  await page.waitForTimeout(150);
}

/** Play every level through to the end using real pointer input. */
async function playThrough(page: Page, levelCount: number, onFirstMoves: () => Promise<void>): Promise<QACheck> {
  let steps = 0, idle = 0, stagnant = 0, shot = false;
  let previous = await qaState(page);
  const completed = new Set<number>();
  while (steps < 800) {
    const phase = await page.evaluate(() => (window as QAWindow).__calmQA!.phase);
    if (phase === "finished" && !(await nextAction(page))) break;
    const a = await nextAction(page);
    if (!a) {
      if (++idle > 40) return { id: "gameplay", label: "Gameplay can be completed", status: "fail", detail: `Play stalled in phase "${phase}" with no available action after ${steps} inputs.` };
      await page.waitForTimeout(150);
      continue;
    }
    idle = 0;
    if (a.label === "Play again") break;
    steps++;
    await perform(page, a);
    const now = await qaState(page);
    const s = JSON.parse(now) as { phase: string; levelIndex: number };
    if (s.phase !== "playing") completed.add(s.levelIndex);
    if (now === previous && a.kind !== "advance") {
      if (++stagnant > 6) return { id: "gameplay", label: "Gameplay can be completed", status: "fail", detail: `Input "${a.label}" had no effect on the game state six times in a row.` };
    } else stagnant = 0;
    previous = now;
    if (!shot && steps === 4) {
      shot = true;
      await onFirstMoves();
    }
  }
  const finished = (await page.evaluate(() => (window as QAWindow).__calmQA!.phase)) === "finished" || completed.size >= levelCount;
  return finished
    ? { id: "gameplay", label: "Gameplay can be completed", status: "pass", detail: `Completed all ${levelCount} level${levelCount > 1 ? "s" : ""} with ${steps} real inputs (clicks, drags and growth time).` }
    : { id: "gameplay", label: "Gameplay can be completed", status: "fail", detail: `Reached ${completed.size} of ${levelCount} levels within ${steps} inputs.` };
}

export interface QAResult {
  report: QAReport;
  screenshot?: Buffer;
}

/**
 * Load a compiled game in headless Chromium under its real CSP and test it:
 * boot, rendering, console errors, network isolation, complete playthrough,
 * keyboard input, mobile layout, studio controls and accessibility hooks.
 */
export async function runQA(html: string, opts: { mode: "template" | "freeform"; warnings?: string[]; attempt?: number } = { mode: "template" }): Promise<QAResult> {
  const started = Date.now();
  const checks: QACheck[] = [];
  const sink = { console: [] as string[], blocked: [] as string[] };
  let screenshot: Buffer | undefined;
  let browser: Browser | null = null;
  const add = (c: QACheck) => checks.push(c);
  try {
    browser = await launch();
  } catch (e) {
    return {
      report: {
        ranAt: new Date().toISOString(),
        passed: false,
        ran: false,
        attempts: opts.attempt ?? 1,
        checks: [{ id: "browser", label: "Headless browser available", status: "fail", detail: `Playwright could not launch Chromium: ${(e as Error).message.split("\n")[0]}. Run "npx playwright install chromium".` }],
        consoleErrors: [],
        durationMs: Date.now() - started,
      },
    };
  }
  try {
    // ── Desktop: boot, render, play ──────────────────────────────────
    let page: Page;
    try {
      page = await openGame(browser, html, DESKTOP, sink);
    } catch (e) {
      add({ id: "boot", label: "Game boots", status: "fail", detail: `The page did not initialise: ${(e as Error).message.split("\n")[0]}` });
      throw e;
    }
    const ready = await page.evaluate(() => (window as QAWindow).__calmQA?.ready === true);
    add({ id: "boot", label: "Game boots", status: ready ? "pass" : "fail", detail: ready ? "Runtime initialised inside the sandbox CSP." : "The runtime reported a startup failure." });
    await page.waitForTimeout(600);

    const render = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      if (c) {
        const ctx = c.getContext("2d");
        if (!ctx) return { ok: false, detail: "canvas has no 2D context" };
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        const seen = new Set<number>();
        for (let i = 0; i < d.length; i += 4 * 997) seen.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4));
        return { ok: seen.size > 6, detail: `${seen.size} distinct colour bands sampled on a ${c.width}×${c.height} canvas` };
      }
      const visible = [...document.body.querySelectorAll("*")].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 40 && r.height > 40;
      }).length;
      return { ok: visible > 0, detail: `${visible} visible elements` };
    });
    add({ id: "render", label: "Renders a visible scene", status: render.ok ? "pass" : "fail", detail: render.detail });

    if (opts.mode === "template") {
      const levelCount = await page.evaluate(() => (window as QAWindow).__calmQA!.levelCount);
      await begin(page);
      add(
        await playThrough(page, levelCount, async () => {
          screenshot = await page.screenshot({ type: "png" });
        }),
      );
    } else {
      for (const [fx, fy] of [[0.5, 0.5], [0.3, 0.6], [0.7, 0.4], [0.5, 0.8]]) {
        await page.mouse.click(DESKTOP.width * fx, DESKTOP.height * fy);
        await page.waitForTimeout(200);
      }
      await page.keyboard.press("Space");
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(500);
      screenshot = await page.screenshot({ type: "png" });
      add({ id: "gameplay", label: "Survives basic interaction", status: sink.console.length ? "fail" : "pass", detail: "Clicked four points and pressed Space and ArrowRight. Freeform games can't be played through automatically." });
    }

    // Studio controls bridge
    await page.evaluate(() => window.postMessage({ type: "calm:pause" }, "*"));
    await page.waitForTimeout(100);
    const paused = await page.evaluate(() => {
      const w = window as QAWindow & { calm?: { paused: boolean } };
      return w.calm?.paused ?? (w.__calmQA!.state() as { paused?: boolean }).paused ?? false;
    });
    add({ id: "controls", label: "Responds to studio controls", status: paused ? "pass" : "fail", detail: paused ? "Pause message was received and applied." : "The game ignored the pause message." });
    await page.context().close();

    // ── Keyboard ─────────────────────────────────────────────────────
    if (opts.mode === "template") {
      const kp = await openGame(browser, html, DESKTOP, sink);
      await kp.waitForTimeout(300);
      await kp.keyboard.press("Enter"); // Begin
      await kp.waitForTimeout(200);
      const before = await qaState(kp);
      for (const k of ["Enter", "ArrowRight", "Enter", "ArrowDown", "Enter", "ArrowLeft", "Enter"]) await kp.keyboard.press(k);
      const after = await qaState(kp);
      const a11y = await kp.evaluate(() => ({
        label: !!document.querySelector("canvas[aria-label]"),
        live: !!document.querySelector("[aria-live]"),
        buttons: [...document.querySelectorAll("button")].every((b) => (b.textContent ?? "").trim() || b.getAttribute("aria-label")),
      }));
      add({ id: "keyboard", label: "Playable with a keyboard", status: before !== after ? "pass" : "fail", detail: before !== after ? "Enter and arrow keys started the game and changed its state." : "Keyboard input did not change the game state." });
      const missing = Object.entries(a11y).filter(([, ok]) => !ok).map(([k]) => k);
      const warnings = opts.warnings ?? [];
      add({
        id: "accessibility",
        label: "Accessibility basics",
        status: missing.length ? "fail" : warnings.length ? "warn" : "pass",
        detail: missing.length ? `Missing: ${missing.join(", ")}` : warnings.length ? warnings.join("; ") : "Labelled canvas, live region for announcements, labelled buttons, palette contrast ≥ 4.5:1.",
      });
      await kp.context().close();
    } else {
      add({ id: "keyboard", label: "Playable with a keyboard", status: "skipped", detail: "Not verifiable automatically for freeform code." });
    }

    // ── Mobile layout ────────────────────────────────────────────────
    const mp = await openGame(browser, html, MOBILE, sink);
    await mp.waitForTimeout(400);
    const layout = await mp.evaluate(() => {
      const overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
      const btn = document.querySelector("#card-action") as HTMLElement | null;
      const r = btn?.getBoundingClientRect();
      return { overflow, button: r ? { h: r.height, inView: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth } : null };
    });
    let reachable = true;
    if (opts.mode === "template") {
      await begin(mp);
      const a = await nextAction(mp);
      const pts = a ? (a.kind === "click" ? [a] : a.kind === "drag" ? [a.from, a.to] : []) : [];
      reachable = pts.every((p) => p.x >= 0 && p.y >= 0 && p.x <= MOBILE.width && p.y <= MOBILE.height);
      const toolbar = await mp.evaluate(() => {
        const t = document.querySelector("#toolbar") as HTMLElement | null;
        if (!t || !t.childElementCount) return true;
        const r = t.getBoundingClientRect();
        return r.bottom <= window.innerHeight && [...t.querySelectorAll("button")].every((b) => b.getBoundingClientRect().height >= 44);
      });
      reachable &&= toolbar;
    }
    const mobileOk = !layout.overflow && reachable && (!layout.button || (layout.button.inView && layout.button.h >= 44));
    add({
      id: "responsive",
      label: "Works at mobile size (390×844)",
      status: mobileOk ? "pass" : "fail",
      detail: mobileOk ? "No horizontal overflow; controls and play targets are on screen with ≥44px touch targets." : `Problems: ${[layout.overflow && "horizontal overflow", !reachable && "play targets or toolbar off screen or too small", layout.button && !layout.button.inView && "start button off screen"].filter(Boolean).join(", ")}`,
    });
    await mp.context().close();
  } catch (e) {
    if (!checks.some((c) => c.status === "fail")) add({ id: "runner", label: "QA run", status: "fail", detail: (e as Error).message.split("\n")[0] });
  } finally {
    await browser?.close().catch(() => {});
  }

  const errors = [...new Set(sink.console)];
  add({ id: "console", label: "No runtime errors", status: errors.length ? "fail" : "pass", detail: errors.length ? `${errors.length} error(s): ${errors[0]}` : "The console stayed clean across every run." });
  add({ id: "network", label: "Isolated from the network", status: sink.blocked.length ? "fail" : "pass", detail: sink.blocked.length ? `Tried to load ${sink.blocked.length} external resource(s), e.g. ${sink.blocked[0]}` : "Made no network requests." });
  const passed = checks.every((c) => !REQUIRED.has(c.id) || c.status === "pass" || c.status === "skipped") && !checks.some((c) => c.status === "fail");
  return { report: { ranAt: new Date().toISOString(), passed, ran: true, attempts: opts.attempt ?? 1, checks, consoleErrors: errors, durationMs: Date.now() - started }, screenshot };
}
