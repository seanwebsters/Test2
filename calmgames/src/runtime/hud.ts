import type { Theme } from "../lib/engine/schemas";
import { rgba, mix, contrastRatio } from "../lib/design-system/color";

export const ICONS = {
  restart:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/></svg>',
  water:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 3c3 4 6 7.2 6 10.5A6 6 0 0 1 6 13.5C6 10.2 9 7 12 3Z"/></svg>',
  channel:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 9c3 0 3 2 6 2s3-2 6-2 3 2 6 2M3 15c3 0 3 2 6 2s3-2 6-2 3 2 6 2"/></svg>',
};

export function hudStyles(theme: Theme): string {
  const ink = theme.ink;
  // Panels sit behind HUD text, so they follow the ink: pale panels for dark
  // ink, deep panels for light ink (night scenes).
  const lightInk = contrastRatio(ink, "#000000") > contrastRatio(ink, "#ffffff");
  const base = lightInk ? mix(theme.sky[0], "#000000", 0.25) : mix(theme.sky[0], "#ffffff", 0.6);
  const panel = rgba(base, lightInk ? 0.66 : 0.72);
  const cardBg = rgba(lightInk ? mix(theme.sky[0], "#000000", 0.15) : mix(theme.sky[0], "#ffffff", 0.7), 0.92);
  return `
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;overflow:hidden;background:${theme.sky[0]};color:${ink};-webkit-tap-highlight-color:transparent}
  body{font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Inter,sans-serif;user-select:none;-webkit-user-select:none}
  canvas{position:fixed;inset:0;width:100%;height:100%;touch-action:none;display:block;outline:none}
  canvas:focus-visible{box-shadow:inset 0 0 0 3px ${rgba(theme.accent, 0.8)}}
  .serif{font-family:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif;letter-spacing:-.01em}
  #top{position:fixed;left:0;right:0;top:0;display:flex;align-items:center;gap:12px;padding:14px 18px;pointer-events:none}
  #top .t{flex:1;min-width:0}
  #top .t b{display:block;font-weight:500;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #lvl{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.72}
  #status{font-size:13px;padding:6px 12px;border-radius:999px;background:${panel};backdrop-filter:blur(10px);white-space:nowrap}
  button{font:inherit;color:inherit;cursor:pointer;border:0;background:none}
  button:focus-visible{outline:2px solid ${theme.accent};outline-offset:2px}
  .icon{pointer-events:auto;width:40px;height:40px;border-radius:999px;display:grid;place-items:center;background:${panel};backdrop-filter:blur(10px);transition:transform .3s}
  .icon:hover{transform:rotate(-20deg)}
  #toolbar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:8px;padding:8px;border-radius:22px;background:${panel};backdrop-filter:blur(14px);box-shadow:0 10px 30px -12px ${rgba(theme.ink, 0.35)};max-width:calc(100% - 24px);overflow-x:auto}
  #toolbar:empty{display:none}
  .tool{min-width:52px;min-height:48px;padding:6px 10px;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:11px;transition:background .3s}
  .tool[aria-pressed=true]{background:${rgba(theme.accent, 0.38)}}
  .tool i{width:14px;height:14px;border-radius:999px;display:block}
  #top{align-items:flex-start}
  #note{display:block;margin-top:4px;max-width:520px;font-size:13.5px;line-height:1.4;font-style:italic;opacity:0;transform:translateY(-3px);transition:opacity 1.2s,transform 1.2s}
  #note.on{opacity:.85;transform:none}
  #card{position:fixed;inset:0;display:grid;place-items:center;padding:24px;background:${rgba(theme.sky[0], 0.35)};backdrop-filter:blur(6px);opacity:0;visibility:hidden;transition:opacity .7s,visibility 0s .7s}
  #card.on{opacity:1;visibility:visible;transition:opacity .7s}
  #card:not(.on),#card:not(.on) *{pointer-events:none!important}
  #card .c{max-width:440px;text-align:center;padding:34px 30px;border-radius:28px;background:${cardBg};border:1px solid ${rgba(ink, 0.08)};box-shadow:0 30px 60px -30px ${rgba(theme.ink, 0.45)};transform:translateY(10px) scale(.98);transition:transform .9s cubic-bezier(.22,1,.36,1)}
  #card.on .c{transform:none}
  #card h1{font-weight:400;font-size:30px;line-height:1.15;margin:0 0 6px}
  #card .k{font-size:11px;letter-spacing:.16em;text-transform:uppercase;opacity:.7}
  #card p{margin:12px 0 22px;opacity:.85}
  #card .emblem{width:64px;height:64px;margin:0 auto 10px;display:block}
  .primary{pointer-events:auto;padding:12px 26px;border-radius:999px;background:${ink};color:${theme.sky[0]};font-weight:500;min-height:44px;transition:transform .3s,box-shadow .3s}
  .primary:hover{transform:translateY(-1px);box-shadow:0 10px 24px -10px ${rgba(ink, 0.6)}}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  @media (prefers-reduced-motion: reduce){*{transition-duration:.01s!important}}
  `;
}

export function createHud(root: HTMLElement, title: string) {
  root.insertAdjacentHTML(
    "beforeend",
    `<div id="top"><div class="t"><span id="lvl"></span><b class="serif"></b><span id="note" class="serif" role="note"></span></div><div id="status" aria-hidden="true"></div><button class="icon" id="restart" aria-label="Restart level">${ICONS.restart}</button></div>
     <div id="toolbar" role="toolbar" aria-label="Tools"></div>
     <div id="card" role="dialog" aria-modal="true" aria-labelledby="card-title"><div class="c"></div></div>
     <div class="sr" aria-live="polite" id="live"></div>`,
  );
  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  $("#top b").textContent = title;
  const status = $("#status"), live = $("#live"), note = $("#note"), toolbar = $("#toolbar"), card = $("#card"), top = $("#top");
  let noteTimer = 0;
  return {
    restartButton: $<HTMLButtonElement>("#restart"),
    setLevel(text: string) {
      $("#lvl").textContent = text;
    },
    setStatus(text: string) {
      status.textContent = text;
    },
    announce(text: string) {
      live.textContent = text;
    },
    /** The level note keeps its space in the header (no layout jump) and fades after a while. */
    note(text: string, ms = 9000) {
      note.textContent = text;
      note.classList.toggle("on", !!text);
      clearTimeout(noteTimer);
      if (text) noteTimer = window.setTimeout(() => note.classList.remove("on"), ms);
    },
    setToolbar(el: HTMLElement | null) {
      toolbar.replaceChildren(...(el ? [el] : []));
    },
    showCard(opts: { kicker: string; title: string; body: string; action: string; emblem?: string; onAction: () => void }) {
      const c = card.querySelector(".c")!;
      c.innerHTML = `${opts.emblem ? `<img class="emblem" alt="" src="${opts.emblem}">` : ""}<div class="k"></div><h1 class="serif" id="card-title"></h1><p></p><button class="primary" id="card-action"></button>`;
      c.querySelector(".k")!.textContent = opts.kicker;
      c.querySelector("h1")!.textContent = opts.title;
      c.querySelector("p")!.textContent = opts.body;
      const btn = c.querySelector("button")!;
      btn.textContent = opts.action;
      let used = false;
      btn.onclick = () => {
        // A card's action runs once, and only while the card is showing.
        if (used || !card.classList.contains("on")) return;
        used = true;
        card.classList.remove("on");
        btn.blur();
        opts.onAction();
      };
      card.classList.add("on");
      setTimeout(() => btn.focus(), 50);
    },
    hideCard() {
      card.classList.remove("on");
    },
    cardVisible() {
      return card.classList.contains("on");
    },
    cardButton(): HTMLButtonElement | null {
      return card.classList.contains("on") ? card.querySelector("#card-action") : null;
    },
    chromeHeights() {
      return { top: Math.ceil(top.getBoundingClientRect().bottom) + 10, bottom: toolbar.childElementCount ? 92 : 20 };
    },
  };
}
export type Hud = ReturnType<typeof createHud>;
