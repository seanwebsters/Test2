// Curriculum data model. Everything a lesson needs is plain, serialisable data,
// so the curriculum can later move to a CMS or database without code changes.

export type SkillId =
  | "foundations"
  | "prompting"
  | "critical"
  | "safety"
  | "everyday"
  | "work"
  | "creative"
  | "building"
  | "automation";

export type Mood = "happy" | "wow" | "thinking" | "wink" | "cheer" | "oops";

/** A rubric check used to coach free-text prompts (works offline, no AI needed). */
export interface Criterion {
  id: string;
  label: string;
  /** Shown when the check is missed. */
  tip: string;
  /** Case-insensitive regex sources; any match passes. */
  any?: string[];
  /** Passes when the prompt has at least this many words. */
  minWords?: number;
}

export interface WriteTask {
  title: string;
  brief: string;
  placeholder: string;
  criteria: Criterion[];
  /** Offline demo responses: shown for strong vs weak prompts so the lesson still teaches. */
  demo: { strong: string; weak: string };
  /** Kind of output the AI should produce in live mode. */
  output?: "text" | "email" | "list" | "plan";
}

export interface ImageTask {
  title: string;
  brief: string;
  placeholder: string;
  criteria: Criterion[];
}

export type Step =
  | {
      kind: "teach";
      title: string;
      body: string;
      bullets?: string[];
      example?: { label: string; text: string };
      mood?: Mood;
    }
  | {
      kind: "choice";
      question: string;
      /** Optional prompt / AI output / scenario shown above the options. */
      context?: { label: string; text: string };
      options: string[];
      answer: number;
      explain: string;
    }
  | { kind: "multi"; question: string; options: string[]; answers: number[]; explain: string }
  | {
      kind: "build";
      question: string;
      /** Correct pieces; when `ordered`, also the correct order. */
      pieces: string[];
      distractors?: string[];
      ordered?: boolean;
      explain: string;
    }
  | {
      kind: "compare";
      question: string;
      prompt?: string;
      a: string;
      b: string;
      answer: "a" | "b";
      explain: string;
    }
  | { kind: "judge"; question: string; prompt: string; response: string; good: boolean; explain: string }
  | {
      kind: "spot";
      question: string;
      intro?: string;
      sentences: { text: string; wrong?: boolean }[];
      explain: string;
    }
  | {
      kind: "sort";
      question: string;
      bins: [string, string];
      items: { text: string; bin: 0 | 1 }[];
      explain: string;
    }
  | { kind: "write"; task: WriteTask }
  | { kind: "image"; task: ImageTask };

export type StepKind = Step["kind"];

export interface LessonSpec {
  title: string;
  subtitle: string;
  skill: SkillId;
  steps: Step[];
}

export interface WorldSpec {
  id: string;
  n: number;
  title: string;
  tagline: string;
  description: string;
  plus: boolean;
  theme: WorldTheme;
  lessons: LessonSpec[]; // 8 authored lessons
  boss: { title: string; subtitle: string; skill: SkillId; task: WriteTask };
}

export interface WorldTheme {
  from: string;
  to: string;
  accent: string;
  ground: string;
  ground2: string;
  icon: string; // emoji used in badges & certificates
  landmark: "tower" | "bubbles" | "house" | "briefcase" | "palette" | "blocks" | "gears" | "crown";
}

export type LessonType = "lesson" | "checkpoint" | "boss";

export interface Lesson {
  id: string; // e.g. "w2-l3"
  worldId: string;
  worldN: number;
  index: number; // 1-based within world
  type: LessonType;
  title: string;
  subtitle: string;
  skill: SkillId;
  xp: number;
  steps: Step[];
}

export interface World extends Omit<WorldSpec, "lessons" | "boss"> {
  lessons: Lesson[];
}
