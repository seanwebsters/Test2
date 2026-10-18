import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "@/lib/content/achievements";
import { CAREERS, getCareer } from "@/lib/content/careers";
import { ALL_STATIC_OPPORTUNITIES } from "@/lib/content/opportunities";
import { allPaths, findMission, FULL_PATH_SLUGS, requirePath } from "@/lib/content/paths";
import { getSkill } from "@/lib/content/skills";
import { CATEGORIES } from "@/lib/content/categories";

describe("career universe", () => {
  it("has at least 100 unique, complete career profiles across all categories", () => {
    expect(CAREERS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(CAREERS.map((c) => c.slug)).size).toBe(CAREERS.length);
    for (const cat of CATEGORIES) expect(CAREERS.some((c) => c.category === cat.id)).toBe(true);
    for (const c of CAREERS) {
      expect(c.summary.length).toBeGreaterThan(40);
      expect(c.dayInLife.length).toBeGreaterThanOrEqual(4);
      expect(c.routes.length).toBeGreaterThan(0);
      expect(c.progression.length).toBeGreaterThan(1);
      expect(c.salary.entry).toBeLessThanOrEqual(c.salary.mid);
      expect(c.salary.mid).toBeLessThanOrEqual(c.salary.senior);
      for (const s of c.skills) expect(getSkill(s), `${c.slug} skill ${s}`).toBeTruthy();
      for (const r of c.related) expect(getCareer(r), `${c.slug} related ${r}`).toBeTruthy();
    }
  });
});

describe("pathways", () => {
  it("has three fully playable hand-written paths with 10 levels and 5+ missions each", () => {
    expect(FULL_PATH_SLUGS.sort()).toEqual(["creative-director", "entrepreneur", "software-engineer"]);
    for (const slug of FULL_PATH_SLUGS) {
      const p = requirePath(slug);
      expect(p.kind).toBe("full");
      expect(p.levels).toHaveLength(10);
      for (const l of p.levels) {
        expect(l.missions.length).toBeGreaterThanOrEqual(5);
        expect(l.missions.filter((m) => m.quest)).toHaveLength(1);
      }
    }
  });

  it("every career has a playable path and every mission resolves", () => {
    const ids = new Set<string>();
    for (const p of allPaths()) {
      expect(p.levels).toHaveLength(10);
      for (const l of p.levels)
        for (const m of l.missions) {
          expect(ids.has(m.id), m.id).toBe(false);
          ids.add(m.id);
          expect(findMission(m.id)?.mission.id).toBe(m.id);
          expect(m.steps.length).toBeGreaterThan(0);
          expect(m.minutes).toBeGreaterThan(0);
          for (const s of m.skills) expect(getSkill(s.id), `${m.id} skill ${s.id}`).toBeTruthy();
          if (m.quest) expect(m.evidence).not.toBe("none");
        }
    }
    expect(ids.size).toBe(CAREERS.length * 50);
  });
});

describe("opportunities", () => {
  it("never presents sample listings as real and only links verified sources over https", () => {
    for (const o of ALL_STATIC_OPPORTUNITIES) {
      if (o.source === "sample") {
        expect(o.url).toBeUndefined();
        expect(o.organisation).toMatch(/\(sample\)/);
      }
      if (o.source === "directory") expect(o.url).toMatch(/^https:\/\//);
    }
  });
});

describe("achievements", () => {
  it("includes the core achievements", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    for (const id of ["first-step", "explorer", "creator", "connector", "portfolio-builder", "interview-ready", "first-break"]) expect(ids).toContain(id);
  });
});
