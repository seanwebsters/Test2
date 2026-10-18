import type { Plan } from "./model";

/**
 * Configurable plan entitlements. Change limits here; the server enforces them
 * on every relevant request and the UI reads the same table.
 */
export interface Entitlements {
  activePaths: number;
  coachMessagesPerDay: number;
  advancedInsights: boolean;
  portfolioFeedback: boolean;
  interviewPractice: boolean;
  enhancedMatching: boolean;
  skillAnalysis: boolean;
}

export const PLANS: Record<Plan, { name: string; priceLabel: string; entitlements: Entitlements; features: string[] }> = {
  free: {
    name: "Direction Free",
    priceLabel: "Free forever",
    entitlements: {
      activePaths: 1,
      coachMessagesPerDay: 10,
      advancedInsights: false,
      portfolioFeedback: false,
      interviewPractice: false,
      enhancedMatching: false,
      skillAnalysis: false,
    },
    features: ["Career discovery & 120+ careers", "One active career path", "Daily missions", "Basic progress tracking", "10 coach messages a day", "Core achievements"],
  },
  plus: {
    name: "Direction Plus",
    priceLabel: "£6.99 / month",
    entitlements: {
      activePaths: 3,
      coachMessagesPerDay: 100,
      advancedInsights: true,
      portfolioFeedback: true,
      interviewPractice: true,
      enhancedMatching: true,
      skillAnalysis: true,
    },
    features: [
      "Up to 3 active career paths",
      "Unlimited coaching (fair use: 100 messages a day)",
      "Advanced personalisation",
      "Detailed skill analysis",
      "Portfolio feedback",
      "Interview practice mode",
      "Enhanced opportunity matching",
      "Advanced progress insights",
    ],
  },
};

export function entitlementsFor(plan: Plan): Entitlements {
  return PLANS[plan].entitlements;
}

export function canActivateAnotherPath(plan: Plan, activeCount: number): boolean {
  return activeCount < entitlementsFor(plan).activePaths;
}

export function coachRemaining(plan: Plan, usedToday: number): number {
  return Math.max(0, entitlementsFor(plan).coachMessagesPerDay - usedToday);
}
