import "server-only";
import crypto from "node:crypto";
import { requirePath } from "@/lib/content/paths";
import { computeStats, newlyUnlocked } from "@/lib/engine/achievements";
import { addDays, dayKey } from "@/lib/engine/dates";
import { rankCareers } from "@/lib/engine/matching";
import { EMPTY_STREAK, type Completion, type OnboardingAnswers, type UserState } from "@/lib/engine/model";
import { recordActivity } from "@/lib/engine/streak";
import { xpForMission } from "@/lib/engine/xp";
import { storeFor, type Viewer } from "./context";
import { defaultProfile } from "./services";

export const DEMO_ANSWERS: OnboardingAnswers = {
  name: "Maya",
  status: "university",
  swipes: { "festival-poster": "love", "music-video": "love", "brand-launch": "yes", runway: "yes", "pitch-room": "yes", "app-bug": "no", lab: "no", courtroom: "no" },
  thisOrThat: { "make-fix": "a", "help-lead": "b", "solo-team": "b", "safe-bold": "b", "idea-plan": "a", "screen-world": "a" },
  interests: ["art", "design", "film", "social-media", "photography"],
  subjects: ["art", "media", "english"],
  social: 0.7,
  lifestyle: "studio",
  values: { money: 2, creativity: 4, stability: 1, flexibility: 2, impact: 1 },
  skills: ["visual-design", "photography", "digital-tools"],
  considered: ["creative-director", "graphic-designer"],
  country: "United Kingdom",
  city: "Manchester",
  minutesPerDay: 15,
};

const EVIDENCE: Record<string, string> = {
  "cd-1-1": "Wieden+Kennedy for its fearless tone, Mother for the weird humour, and a small studio I found through award annuals whose packaging is gorgeous.",
  "cd-1-3": "Read an interview with a creative director who started as a junior designer at a tiny agency and moved up by always pitching extra ideas.",
  "cd-1-5": "A Creative Director is the person who protects the big idea. They don't make every ad themselves — they guide the team, kill weak ideas kindly and sell brave ones to clients.",
  "cd-2-1": "Insight: people feel guilty buying fast fashion. Idea: a campaign that celebrates re-wearing. Execution: real customers in 5-year-old outfits. It worked because it flipped guilt into pride.",
  "cd-2-5": "30 ideas in 30 minutes! Best three: a water bottle that 'levels up', refill stations at gigs, and a TikTok filter that shows you wilting when you're dehydrated.",
  "cd-3-1": "Invented 'Tidewater', a sea-salt skincare brand for surfers. Board: muted blues, rough paper, sun-bleached type. Mood: salty, calm, honest.",
  "en-1-1": "Spotted that all three started by selling to friends before building anything big.",
};

/** Seeds a demo user who has been using Direction for about ten days. */
export async function seedDemo(viewer: Viewer) {
  const store = storeFor(viewer);
  const now = new Date();
  const today = dayKey(now, "Europe/London");
  const profile = defaultProfile(viewer, "Maya");
  profile.isDemo = true;
  profile.handle = `maya${crypto.randomInt(1000, 9999)}`;
  profile.onboarding = DEMO_ANSWERS;
  profile.onboardedAt = new Date(now.getTime() - 10 * 86400_000).toISOString();
  profile.matches = rankCareers(DEMO_ANSWERS).slice(0, 12);
  profile.privacy = { ...profile.privacy, passportPublic: true, showTimeline: true };

  const plan: [string, number, -1 | 0 | 1 | null][] = [
    // [missionId, daysAgo, rating]
    ["cd-1-2", 9, 1],
    ["cd-1-1", 9, 1],
    ["cd-1-4", 8, 1],
    ["cd-1-3", 6, 0],
    ["cd-1-5", 5, 1],
    ["en-1-1", 5, 0],
    ["cd-2-3", 4, 1],
    ["cd-2-2", 4, null],
    ["cd-2-1", 3, 1],
    ["cd-2-5", 2, 1],
    ["cd-3-1", 1, 1],
    ["cd-3-3", 1, null],
  ];
  const completions: Completion[] = [];
  let streak = { ...EMPTY_STREAK };
  for (const [missionId, ago, rating] of plan) {
    const day = addDays(today, -ago);
    const path = missionId.startsWith("en") ? requirePath("entrepreneur") : requirePath("creative-director");
    const mission = path.levels.flatMap((l) => l.missions).find((m) => m.id === missionId)!;
    const evidence = EVIDENCE[missionId] ?? null;
    const reflection = rating === 1 && ago % 2 === 1 ? "Loved this more than I expected — want to do more like it." : null;
    completions.push({
      id: crypto.randomUUID(),
      missionId,
      careerSlug: path.careerSlug,
      completedAt: new Date(`${day}T${String(10 + (ago % 8)).padStart(2, "0")}:15:00.000Z`).toISOString(),
      day,
      evidence,
      reflection,
      rating,
      xp: xpForMission({ mission, hasEvidence: !!evidence, hasReflection: !!reflection, daily: true }),
      skillPoints: mission.skills,
      source: missionId.startsWith("en") ? "daily" : "path",
    });
    streak = recordActivity(streak, day).state;
  }
  profile.streak = streak;

  await store.saveProfile(profile);
  const started = new Date(now.getTime() - 9 * 86400_000).toISOString();
  await store.savePath(viewer.userId, { careerSlug: "creative-director", status: "active", startedAt: started, skippedThrough: 0, lastActiveAt: completions.at(-1)!.completedAt });
  await store.savePath(viewer.userId, { careerSlug: "entrepreneur", status: "paused", startedAt: completions[5]!.completedAt, skippedThrough: 0, lastActiveAt: completions[5]!.completedAt });
  for (const c of completions) await store.addCompletion(viewer.userId, c);

  const viewed = ["creative-director", "graphic-designer", "product-designer", "film-director", "entrepreneur", "brand-strategist"];
  for (const [i, slug] of viewed.entries()) await store.addCareerView(viewer.userId, slug, new Date(now.getTime() - (10 - i) * 86400_000).toISOString());

  await store.saveBookmark(viewer.userId, { opportunityId: "dir-dandad", status: "saved", notes: "Check the student brief before December.", updatedAt: started, snapshot: null });
  await store.saveBookmark(viewer.userId, { opportunityId: "sample-creative-intern", status: "applied", notes: "Sent portfolio + short note.", updatedAt: completions[9]!.completedAt, snapshot: null });

  await store.savePassportItem(viewer.userId, {
    id: crypto.randomUUID(),
    kind: "experience",
    title: "Social media volunteer",
    organisation: "Student film society",
    startDate: "2025-10-01",
    endDate: null,
    description: "Design posters and short promo reels for weekly screenings.",
    url: null,
    isPublic: true,
    createdAt: started,
  });
  await store.savePassportItem(viewer.userId, {
    id: crypto.randomUUID(),
    kind: "education",
    title: "BA Media & Communication (Year 2)",
    organisation: "University",
    startDate: "2024-09-01",
    endDate: null,
    description: "Modules in visual culture, advertising and digital storytelling.",
    url: null,
    isPublic: true,
    createdAt: started,
  });

  const t0 = new Date(now.getTime() - 3 * 86400_000);
  await store.addCoachMessage(viewer.userId, { id: crypto.randomUUID(), role: "user", content: "How do I make my moodboards look more professional?", createdAt: t0.toISOString(), provider: null });
  await store.addCoachMessage(viewer.userId, {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "Great question! Three quick upgrades:\n\n1. **Limit your palette** — pull 3–4 colours from your images and repeat them.\n2. **Vary scale** — one hero image, a few medium, some tiny texture shots.\n3. **Add one line of words** — a mood or a brand promise ties it together.\n\nWant to try it on your Tidewater board and show me?",
    createdAt: new Date(t0.getTime() + 20_000).toISOString(),
    provider: "offline",
  });

  // Unlock what the history has earned.
  const state: UserState = {
    profile,
    paths: await store.listPaths(viewer.userId),
    completions,
    achievements: [],
    bookmarks: await store.listBookmarks(viewer.userId),
    careerViews: await store.listCareerViews(viewer.userId),
    passport: [],
    coachMessageCount: 2,
    coachConversations: 1,
  };
  const unlocked = newlyUnlocked(computeStats(state), new Set());
  await store.addAchievements(
    viewer.userId,
    unlocked.map((a, i) => ({ achievementId: a.id, unlockedAt: new Date(now.getTime() - (8 - Math.min(i, 7)) * 86400_000).toISOString() })),
  );
}
