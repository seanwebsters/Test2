import { DEMO_USERS } from "@/lib/seed/build";

/** Seeded personas for the prototype's sign-in switcher (one per entitlement tier). */
export const DEMO_PERSONAS = [
  { userId: "user-sam", label: "Free listener", description: "Signed in without Calm Premium – previews only." },
  { userId: DEMO_USERS.listener, label: "Premium listener", description: "Full catalogue, library and recommendations." },
  { userId: DEMO_USERS.creator, label: "Creator", description: "Premium + Storymaker and creator studio." },
  { userId: DEMO_USERS.admin, label: "Calm administrator", description: "Editorial review, agents and production." },
] as const;
