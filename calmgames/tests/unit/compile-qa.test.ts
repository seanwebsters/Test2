import { describe, expect, it } from "vitest";
import { compileGame, GAME_CSP } from "@/lib/engine/compile";
import { validateBuild, validateConfig } from "@/lib/engine/validate";
import { runQA } from "@/lib/qa/run";
import { breatheAndFlow, starStories, sunsetPath, tidalGarden } from "@/lib/seeds";
import { sanitizeSvg } from "@/lib/svg";

const seeds = { sunsetPath, tidalGarden, breatheAndFlow, starStories };

describe("compiler", () => {
  it("validates every seed configuration", () => {
    for (const c of Object.values(seeds)) expect(validateConfig(c)).toMatchObject({ ok: true, errors: [], warnings: [] });
  });

  it("builds a self-contained document with a locked-down CSP", () => {
    const html = compileGame({ mode: "template", config: { ...sunsetPath, title: "</script><b>x" } });
    expect(html).toContain(GAME_CSP);
    expect(GAME_CSP).toContain("connect-src 'none'");
    expect(GAME_CSP).not.toContain("unsafe-eval");
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html.match(/<\/script>/g)!.length).toBe(3); // config, emblem, runtime: the title can't break out
  });

  it("rejects freeform code that reaches for the network", () => {
    expect(validateBuild({ mode: "freeform", title: "x", engine: "canvas", html: "<canvas></canvas><script>fetch('/api')</script>" }).errors.join()).toMatch(/network/);
    expect(validateBuild({ mode: "freeform", title: "x", engine: "canvas", html: '<script src="https://x.y/z.js"></script><canvas>' }).errors.join()).toMatch(/external/);
  });

  it("strips active content from SVG", () => {
    const svg = sanitizeSvg('<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(1)</script><a href="https://x"><circle r="1"/></a><rect fill="url(https://x/y)"/></svg>')!;
    expect(svg).not.toMatch(/onload|script|https/);
    expect(svg).toContain("xmlns");
  });
});

describe("automated QA in a real browser", () => {
  for (const [name, config] of Object.entries(seeds)) {
    it(`plays ${name} start to finish and passes every check`, async () => {
      const { report, screenshot } = await runQA(compileGame({ mode: "template", config }), { mode: "template" });
      const failures = report.checks.filter((c) => c.status !== "pass");
      expect(failures, JSON.stringify(failures, null, 1)).toEqual([]);
      expect(report.ran).toBe(true);
      expect(report.passed).toBe(true);
      expect(screenshot?.length).toBeGreaterThan(1000);
    });
  }

  it("fails a game that throws at startup", async () => {
    const broken = compileGame({ mode: "freeform", title: "broken", engine: "canvas", html: "<canvas></canvas><script>undefinedFn()</script>" });
    const { report } = await runQA(broken, { mode: "freeform" });
    expect(report.passed).toBe(false);
    expect(report.checks.find((c) => c.id === "console")?.status).toBe("fail");
  });
});
