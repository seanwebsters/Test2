/**
 * Injected ahead of experimental freeform code. It gives that code the same
 * studio controls as template games (pause, restart, sound) and reports
 * errors and play events, without exposing anything else.
 */
const errors: string[] = [];
const post = (msg: Record<string, unknown>) => window.parent?.postMessage({ source: "calm-game", ...msg }, "*");
const calm = { paused: false, sound: true };
(window as unknown as { calm: typeof calm }).calm = calm;
window.addEventListener("error", (e) => {
  errors.push(String(e.message || e.error));
  post({ type: "event", name: "error", data: { message: String(e.message) } });
});
window.addEventListener("unhandledrejection", (e) => errors.push(String(e.reason)));
window.addEventListener("message", (e) => {
  const m = e.data as { type?: string; on?: boolean } | null;
  if (!m || typeof m.type !== "string") return;
  if (m.type === "calm:pause") calm.paused = true;
  if (m.type === "calm:resume") calm.paused = false;
  if (m.type === "calm:sound") calm.sound = !!m.on;
  if (m.type === "calm:restart") return location.reload();
  window.dispatchEvent(new CustomEvent(m.type, { detail: m }));
  post({ type: "state", paused: calm.paused, sound: calm.sound });
});
let started = false;
window.addEventListener("pointerdown", () => {
  if (!started) (started = true), post({ type: "event", name: "session_start" });
});
// Freeform games may call window.calmComplete() when the player finishes.
(window as unknown as { calmComplete: () => void }).calmComplete = () => post({ type: "event", name: "game_complete" });
(window as unknown as { __calmQA: unknown }).__calmQA = { ready: true, archetype: "freeform", errors, levelCount: 1, next: () => null, state: () => ({}) };
