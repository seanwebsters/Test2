import type { Skill, SkillFamily } from "./types";

/**
 * One shared skill catalogue. Skills earned on any path count everywhere, so
 * switching direction never throws progress away.
 */
export const SKILLS: Skill[] = [
  // creative
  { id: "visual-design", name: "Visual Design", family: "creative", description: "Layout, colour, hierarchy and making things look intentional." },
  { id: "typography", name: "Typography", family: "creative", description: "Choosing and setting type that communicates." },
  { id: "concepting", name: "Concepting", family: "creative", description: "Turning a brief into a big, simple idea." },
  { id: "storytelling", name: "Storytelling", family: "creative", description: "Structuring ideas so people feel something." },
  { id: "writing", name: "Writing", family: "creative", description: "Clear, persuasive writing for any audience." },
  { id: "art-direction", name: "Art Direction", family: "creative", description: "Setting the visual direction for a piece of work." },
  { id: "photography", name: "Photography & Video", family: "creative", description: "Capturing and editing images and footage." },
  { id: "performance", name: "Performance", family: "creative", description: "Presence, voice and craft in front of an audience." },
  { id: "music-craft", name: "Music Craft", family: "creative", description: "Composition, production and an ear for sound." },
  { id: "trend-sense", name: "Trend Sense", family: "creative", description: "Spotting cultural shifts before they peak." },
  // technical
  { id: "programming", name: "Programming", family: "technical", description: "Writing working code to solve real problems." },
  { id: "web-dev", name: "Web Development", family: "technical", description: "Building sites and apps that run in the browser." },
  { id: "systems-thinking", name: "Systems Thinking", family: "technical", description: "Seeing how the parts of a system affect each other." },
  { id: "data-analysis", name: "Data Analysis", family: "technical", description: "Finding the story in numbers." },
  { id: "ai-literacy", name: "AI Literacy", family: "technical", description: "Using AI tools well, and knowing their limits." },
  { id: "debugging", name: "Debugging", family: "technical", description: "Finding out why things break, methodically." },
  { id: "digital-tools", name: "Digital Tools", family: "technical", description: "Getting fluent with the tools of the trade." },
  { id: "research-methods", name: "Research Methods", family: "technical", description: "Designing investigations that produce trustworthy answers." },
  { id: "technical-drawing", name: "Technical Design", family: "technical", description: "Specifying physical things precisely." },
  { id: "clinical-knowledge", name: "Clinical Knowledge", family: "technical", description: "Understanding the body, health and care." },
  // people
  { id: "communication", name: "Communication", family: "people", description: "Explaining ideas so they land." },
  { id: "presenting", name: "Presenting & Pitching", family: "people", description: "Selling an idea to a room." },
  { id: "collaboration", name: "Collaboration", family: "people", description: "Getting great work done with others." },
  { id: "leadership", name: "Leadership", family: "people", description: "Setting direction and bringing people with you." },
  { id: "networking", name: "Networking", family: "people", description: "Building genuine professional relationships." },
  { id: "empathy", name: "Empathy & Care", family: "people", description: "Understanding what people need and feel." },
  { id: "teaching", name: "Teaching & Coaching", family: "people", description: "Helping others get better." },
  { id: "negotiation", name: "Negotiation", family: "people", description: "Reaching agreements that work for everyone." },
  { id: "feedback", name: "Giving & Taking Feedback", family: "people", description: "Using critique to make work better." },
  // business
  { id: "customer-insight", name: "Customer Insight", family: "business", description: "Understanding what people actually want." },
  { id: "strategy", name: "Strategy", family: "business", description: "Choosing where to play and how to win." },
  { id: "marketing", name: "Marketing", family: "business", description: "Reaching the right people with the right message." },
  { id: "finance-basics", name: "Financial Literacy", family: "business", description: "Budgets, pricing, profit and cash." },
  { id: "product-sense", name: "Product Sense", family: "business", description: "Knowing what to build next, and why." },
  { id: "project-management", name: "Project Management", family: "business", description: "Getting complex things delivered on time." },
  { id: "sales", name: "Sales", family: "business", description: "Helping people say yes." },
  { id: "industry-knowledge", name: "Industry Knowledge", family: "business", description: "Knowing the players, history and how money flows." },
  { id: "advocacy", name: "Argument & Advocacy", family: "business", description: "Building a case and defending it." },
  // self
  { id: "resilience", name: "Resilience", family: "self", description: "Bouncing back from rejection and setbacks." },
  { id: "curiosity", name: "Curiosity", family: "self", description: "Asking good questions and following them." },
  { id: "self-management", name: "Self-Management", family: "self", description: "Planning your time and keeping promises to yourself." },
  { id: "portfolio", name: "Portfolio Building", family: "self", description: "Showing your work so others can see what you can do." },
  { id: "career-craft", name: "Career Craft", family: "self", description: "CVs, applications, interviews and job hunting." },
  { id: "physical-performance", name: "Physical Performance", family: "self", description: "Training, conditioning and looking after your body." },
];

const byId = new Map(SKILLS.map((s) => [s.id, s]));

export function getSkill(id: string): Skill | undefined {
  return byId.get(id);
}

export function skillName(id: string): string {
  return byId.get(id)?.name ?? id;
}

export const SKILL_FAMILIES: Record<SkillFamily, { name: string; accent: string }> = {
  creative: { name: "Creative", accent: "coral" },
  technical: { name: "Technical", accent: "teal" },
  people: { name: "People", accent: "lavender" },
  business: { name: "Business", accent: "sun" },
  self: { name: "Self", accent: "mint" },
};

/** Points needed for each skill tier. Tier 0 = untouched. */
export const SKILL_TIERS = [0, 10, 30, 70, 140, 250] as const;
export const SKILL_TIER_NAMES = ["Untouched", "Curious", "Developing", "Capable", "Strong", "Expert"] as const;

export function skillTier(points: number): { tier: number; name: string; progress: number; next: number | null } {
  let tier = 0;
  for (let i = 0; i < SKILL_TIERS.length; i++) if (points >= SKILL_TIERS[i]!) tier = i;
  const next = SKILL_TIERS[tier + 1] ?? null;
  const floor = SKILL_TIERS[tier]!;
  const progress = next === null ? 1 : (points - floor) / (next - floor);
  return { tier, name: SKILL_TIER_NAMES[tier]!, progress, next };
}
