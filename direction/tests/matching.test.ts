import { describe, expect, it } from "vitest";
import { creativeAnswers } from "./helpers";
import { feedbackFromRatings, rankCareers, topDirections } from "@/lib/engine/matching";
import { scrubUnverified } from "@/lib/server/ai/insight";
import { offlineReply } from "@/lib/server/ai/offline";
import { DEFAULT_PRIVACY, EMPTY_STREAK, type UserState } from "@/lib/engine/model";

describe("matching", () => {
  it("is deterministic and explains results with the user's own answers", () => {
    const a = creativeAnswers();
    const r1 = topDirections(a);
    const r2 = topDirections(a);
    expect(r1).toEqual(r2);
    expect(r1).toHaveLength(3);
    expect(r1[0]!.reasons.length).toBeGreaterThan(0);
    expect(r1[0]!.reasons.some((r) => /festival poster|art|design|film/i.test(r.text))).toBe(true);
    for (const m of rankCareers(a)) {
      expect(m.percent).toBeGreaterThanOrEqual(30);
      expect(m.percent).toBeLessThanOrEqual(97);
    }
  });

  it("puts creative careers on top for creative answers and tech careers for tech answers", () => {
    const creative = topDirections(creativeAnswers()).map((m) => m.careerSlug);
    expect(creative.some((s) => ["creative-director", "graphic-designer", "product-designer", "illustrator", "animator"].includes(s))).toBe(true);
    const tech = topDirections(
      creativeAnswers({
        swipes: { "app-bug": "love", "ai-model": "love", "festival-poster": "no" },
        thisOrThat: { "make-fix": "b", "solo-team": "a", "screen-world": "a" },
        interests: ["tech", "ai", "games"],
        subjects: ["computing", "maths"],
        values: { money: 3, creativity: 2, stability: 3, flexibility: 2, impact: 0 },
        skills: ["programming"],
        lifestyle: "free",
      }),
    ).map((m) => m.careerSlug);
    expect(tech.some((s) => ["software-engineer", "ml-engineer", "data-scientist", "game-developer", "frontend-developer", "cybersecurity-analyst"].includes(s))).toBe(true);
  });

  it("turns ratings into feedback", () => {
    expect(feedbackFromRatings([{ careerSlug: "x", rating: 1 }, { careerSlug: "x", rating: 1 }, { careerSlug: "y", rating: -1 }])).toEqual({ x: 1, y: -0.5 });
  });
});

describe("AI safeguards", () => {
  it("scrubs invented salaries and grades from generated content", () => {
    expect(scrubUnverified("It's creative work. You'll earn £45,000 a year. Most need an A* in art.")).toBe("It's creative work.");
  });

  it("offline coach signposts help for someone in distress", () => {
    const state: UserState = {
      profile: { id: "u", email: null, displayName: "Sam", handle: "sam", createdAt: "", onboarding: null, onboardedAt: null, matches: [], timezone: "Europe/London", plan: "free", planSource: "none", planRenewsAt: null, stripeCustomerId: null, streak: EMPTY_STREAK, privacy: DEFAULT_PRIVACY, challenge: null, isDemo: false },
      paths: [], completions: [], achievements: [], bookmarks: [], careerViews: [], passport: [], coachMessageCount: 0, coachConversations: 0,
    };
    expect(offlineReply(state, "2026-10-18", "I feel hopeless")).toMatch(/116 123/);
    expect(offlineReply(state, "2026-10-18", "Tell me about being a Software Engineer")).toMatch(/Software Engineer/);
  });
});
