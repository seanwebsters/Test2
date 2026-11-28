import type { Lesson, Step, World, WorldSpec } from "./types";
import { w1 } from "./worlds/w1";
import { w2 } from "./worlds/w2";
import { w3 } from "./worlds/w3";
import { w4 } from "./worlds/w4";
import { w5 } from "./worlds/w5";
import { w6 } from "./worlds/w6";
import { w7 } from "./worlds/w7";
import { w8 } from "./worlds/w8";

// To add a world: author a WorldSpec file and append it here. Each world is
// assembled as: 4 lessons → checkpoint review → 4 lessons → world challenge.
const SPECS: WorldSpec[] = [w1, w2, w3, w4, w5, w6, w7, w8];

const reviewable = (s: Step) => s.kind !== "teach" && s.kind !== "write" && s.kind !== "image";

function pick<T>(items: T[], n: number, seed: number): T[] {
  const arr = [...items];
  let x = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

function buildWorld(spec: WorldSpec): World {
  const lessons: Lesson[] = [];
  const mk = (index: number, partial: Omit<Lesson, "id" | "worldId" | "worldN" | "index">): Lesson => ({
    id: `${spec.id}-l${index}`,
    worldId: spec.id,
    worldN: spec.n,
    index,
    ...partial,
  });

  spec.lessons.slice(0, 4).forEach((l, i) => lessons.push(mk(i + 1, { ...l, type: "lesson", xp: 15 })));

  const firstHalf = spec.lessons.slice(0, 4).flatMap((l) => l.steps.filter(reviewable));
  lessons.push(
    mk(5, {
      type: "checkpoint",
      title: "Checkpoint",
      subtitle: `Review: ${spec.lessons[0].title} → ${spec.lessons[3].title}`,
      skill: spec.lessons[0].skill,
      xp: 25,
      steps: [
        { kind: "teach", title: "Checkpoint time!", body: "A quick mix of what you've learned so far. Nail it to unlock the second half of this world.", mood: "cheer" },
        ...pick(firstHalf, 6, spec.n * 7 + 3),
      ],
    }),
  );

  spec.lessons.slice(4, 8).forEach((l, i) => lessons.push(mk(i + 6, { ...l, type: "lesson", xp: 15 })));

  const secondHalf = spec.lessons.slice(4, 8).flatMap((l) => l.steps.filter(reviewable));
  lessons.push(
    mk(10, {
      type: "boss",
      title: spec.boss.title,
      subtitle: spec.boss.subtitle,
      skill: spec.boss.skill,
      xp: 50,
      steps: [
        { kind: "teach", title: spec.boss.subtitle, body: "This is a real-world challenge. Warm up with three quick questions, then write a prompt — Aibi will score it and coach you.", mood: "wow" },
        ...pick(secondHalf, 3, spec.n * 13 + 1),
        { kind: "write", task: spec.boss.task },
      ],
    }),
  );

  const { lessons: _l, boss: _b, ...rest } = spec;
  return { ...rest, lessons };
}

export const WORLDS: World[] = SPECS.map(buildWorld);
export const ALL_LESSONS: Lesson[] = WORLDS.flatMap((w) => w.lessons);
export const LESSON_ORDER: string[] = ALL_LESSONS.map((l) => l.id);

export function getLesson(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}
export function getWorld(id: string): World | undefined {
  return WORLDS.find((w) => w.id === id);
}

export const SKILL_LABELS: Record<string, { label: string; emoji: string }> = {
  foundations: { label: "AI foundations", emoji: "🧠" },
  prompting: { label: "Prompting", emoji: "💬" },
  critical: { label: "Critical thinking", emoji: "🔍" },
  safety: { label: "Safety & privacy", emoji: "🛡️" },
  everyday: { label: "Everyday life", emoji: "🏡" },
  work: { label: "Work & productivity", emoji: "💼" },
  creative: { label: "Creativity", emoji: "🎨" },
  building: { label: "Building", emoji: "🚀" },
  automation: { label: "Automation", emoji: "⚙️" },
};
