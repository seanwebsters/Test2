// Onboarding answer options, shared by onboarding, personalisation and profile editing.

export const FAMILIARITY = [
  { id: "beginner", icon: "🌱", title: "Complete beginner", sub: "I'm new to AI and want to learn." },
  { id: "familiar", icon: "📊", title: "A bit familiar", sub: "I've tried it a few times." },
  { id: "confident", icon: "⚡", title: "Quite confident", sub: "I use AI regularly." },
  { id: "advanced", icon: "⭐", title: "Advanced", sub: "I want to level up my skills." },
] as const;
export type Familiarity = (typeof FAMILIARITY)[number]["id"];

export const INTERESTS = [
  { id: "work", icon: "💻", title: "Work & productivity", sub: "" },
  { id: "growth", icon: "🏔️", title: "Personal growth", sub: "" },
  { id: "creativity", icon: "📷", title: "Creativity", sub: "images, video, music" },
  { id: "everyday", icon: "🌴", title: "Everyday life", sub: "travel, cooking, plans" },
  { id: "build", icon: "🚀", title: "Build something", sub: "apps, websites, ideas" },
  { id: "business", icon: "💼", title: "Business", sub: "& side projects" },
] as const;
export type Interest = (typeof INTERESTS)[number]["id"];

export const WORK = [
  { id: "office", icon: "💻", title: "I work in an office / business", sub: "" },
  { id: "creator", icon: "🎨", title: "I'm a creator", sub: "content, design, etc." },
  { id: "owner", icon: "🏪", title: "I run my own business", sub: "" },
  { id: "student", icon: "🎓", title: "I'm a student", sub: "" },
  { id: "notworking", icon: "👤", title: "I'm not currently working", sub: "" },
] as const;
export type Work = (typeof WORK)[number]["id"];

export const MINUTES = [
  { id: 5, icon: "⏱️", title: "5 minutes a day", sub: "A quick, easy habit.", goalXp: 30 },
  { id: 10, icon: "⏰", title: "10 minutes a day", sub: "Build momentum faster.", goalXp: 50 },
  { id: 15, icon: "⏰", title: "15 minutes a day", sub: "Go a little deeper.", goalXp: 80 },
  { id: 30, icon: "⏰", title: "As much as I can", sub: "I'm keen to power through.", goalXp: 120 },
] as const;
export type Minutes = (typeof MINUTES)[number]["id"];

export const GOALS = [
  { id: "time", icon: "⏳", title: "Save time every week", sub: "Get through tasks faster" },
  { id: "career", icon: "📈", title: "Boost my career", sub: "Stand out with in-demand skills" },
  { id: "create", icon: "✨", title: "Create amazing things", sub: "Images, stories, videos, music" },
  { id: "confidence", icon: "🛡️", title: "Use AI safely and confidently", sub: "Know what to trust" },
  { id: "build", icon: "🧩", title: "Build a project or business", sub: "Turn ideas into reality" },
] as const;
export type Goal = (typeof GOALS)[number]["id"];

export interface Profile {
  name: string;
  familiarity: Familiarity;
  interests: Interest[];
  work: Work;
  minutes: Minutes;
  goal: Goal;
  createdAt: string;
}

export const goalXpFor = (m: Minutes) => MINUTES.find((x) => x.id === m)?.goalXp ?? 30;

export const LEVEL_LABEL: Record<Familiarity, string> = {
  beginner: "Beginner",
  familiar: "Explorer",
  confident: "Confident",
  advanced: "Advanced",
};

/** Worlds most relevant to the user's answers, in priority order. */
export function focusWorlds(p: Pick<Profile, "interests" | "work" | "goal">): string[] {
  const score: Record<string, number> = { w3: 0, w4: 0, w5: 0, w6: 0, w7: 0, w8: 0 };
  const add = (w: string, n: number) => (score[w] = (score[w] ?? 0) + n);
  for (const i of p.interests) {
    if (i === "work") (add("w4", 3), add("w7", 2));
    if (i === "growth") (add("w3", 2), add("w8", 2));
    if (i === "creativity") add("w5", 3);
    if (i === "everyday") add("w3", 3);
    if (i === "build") add("w6", 3);
    if (i === "business") (add("w6", 2), add("w4", 1), add("w7", 1));
  }
  if (p.work === "office") (add("w4", 2), add("w7", 1));
  if (p.work === "creator") add("w5", 2);
  if (p.work === "owner") (add("w6", 2), add("w7", 2));
  if (p.work === "student") (add("w3", 1), add("w8", 1));
  if (p.goal === "time") add("w7", 2);
  if (p.goal === "career") (add("w4", 2), add("w8", 1));
  if (p.goal === "create") add("w5", 2);
  if (p.goal === "confidence") add("w8", 1);
  if (p.goal === "build") add("w6", 2);
  return Object.entries(score)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

export function goalSummary(p: Pick<Profile, "interests">): string {
  const names: Record<Interest, string> = {
    work: "work",
    growth: "personal growth",
    creativity: "creativity",
    everyday: "everyday life",
    build: "building things",
    business: "business",
  };
  const list = p.interests.map((i) => names[i]);
  if (list.length === 0) return "Use AI with confidence";
  if (list.length === 1) return `Use AI for ${list[0]}`;
  return `Use AI for ${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}
