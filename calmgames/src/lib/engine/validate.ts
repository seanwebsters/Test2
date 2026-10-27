import { buildSchema, type GameBuild, type GameConfig, gameConfigSchema, type Theme } from "./schemas";
import { validateTileLevel } from "./tile";
import { validateGardenLevel } from "./garden";
import { validateConstellationLevel } from "./constellation";
import { contrastRatio } from "../design-system/color";

export interface ValidationReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

function themeWarnings(theme: Theme): string[] {
  const warnings: string[] = [];
  const top = theme.sky[0], bottom = theme.sky.at(-1)!;
  const worst = Math.min(contrastRatio(theme.ink, top), contrastRatio(theme.ink, bottom));
  if (worst < 4.5) warnings.push(`text contrast over the sky is ${worst.toFixed(2)}:1; WCAG AA asks for 4.5:1`);
  return warnings;
}

/** Schema check plus the gameplay rules a schema can't express (winnable levels, legal paths). */
export function validateConfig(input: unknown): ValidationReport & { config?: GameConfig } {
  const parsed = gameConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".") || "config"}: ${i.message}`), warnings: [] };
  }
  const config = parsed.data;
  const errors: string[] = [];
  config.levels.forEach((level, n) => {
    const issues =
      config.archetype === "tile-path"
        ? validateTileLevel(level as never)
        : config.archetype === "garden"
          ? validateGardenLevel(level as never)
          : validateConstellationLevel(level as never);
    errors.push(...issues.map((e) => `levels[${n}] "${level.name}": ${e}`));
  });
  return { ok: errors.length === 0, errors, warnings: themeWarnings(config.theme), config };
}

export function validateBuild(input: unknown): ValidationReport & { build?: GameBuild } {
  const parsed = buildSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), warnings: [] };
  if (parsed.data.mode === "template") {
    const r = validateConfig(parsed.data.config);
    return { ...r, build: parsed.data };
  }
  const errors: string[] = [];
  const html = parsed.data.html;
  if (/<script[^>]+src\s*=/i.test(html)) errors.push("freeform code may not load external scripts");
  if (/\b(fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|sendBeacon)\b/.test(html)) errors.push("freeform code may not make network requests");
  if (!/<canvas|<svg|addEventListener|onclick/i.test(html)) errors.push("freeform code has no visible surface or input handling");
  return { ok: errors.length === 0, errors, warnings: [], build: parsed.data };
}
