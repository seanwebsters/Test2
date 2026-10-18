import { z } from "zod";

const value = z.number().min(0).max(10);

export const OnboardingSchema = z.object({
  name: z.string().trim().max(40),
  status: z.enum(["school", "university", "employed", "unemployed", "exploring"]),
  swipes: z.record(z.enum(["no", "yes", "love"])),
  thisOrThat: z.record(z.enum(["a", "b"])),
  interests: z.array(z.string().max(40)).max(40),
  subjects: z.array(z.string().max(40)).max(40),
  social: z.number().min(0).max(1),
  lifestyle: z.string().max(40).nullable(),
  values: z.object({ money: value, creativity: value, stability: value, flexibility: value, impact: value }),
  skills: z.array(z.string().max(40)).max(60),
  considered: z.array(z.string().max(60)).max(20),
  country: z.string().max(60),
  city: z.string().trim().max(60),
  minutesPerDay: z.number().int().min(5).max(240),
});

export const CredentialsSchema = z.object({
  email: z.string().trim().email("Please enter a valid email.").max(200),
  password: z.string().min(8, "Use at least 8 characters for your password.").max(200),
});

export const CompleteSchema = z.object({
  missionId: z.string().max(120),
  evidence: z.string().max(4000).nullish(),
  reflection: z.string().max(2000).nullish(),
  rating: z.union([z.literal(-1), z.literal(0), z.literal(1)]).nullish(),
  placement: z.boolean().optional(),
  challengeDay: z.number().int().min(1).max(30).nullish(),
});

export const BookmarkSchema = z.object({
  opportunityId: z.string().max(200),
  status: z.enum(["saved", "applied", "interviewing", "secured", "closed"]),
  notes: z.string().max(2000).optional(),
  snapshot: z.any().optional(),
});

export const PassportItemSchema = z.object({
  id: z.string().max(80).optional(),
  kind: z.enum(["experience", "certification", "project", "education"]),
  title: z.string().trim().min(1).max(120),
  organisation: z.string().trim().max(120).default(""),
  startDate: z.string().max(20).nullable().default(null),
  endDate: z.string().max(20).nullable().default(null),
  description: z.string().max(1500).default(""),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((u) => u === "" || /^https?:\/\//i.test(u), "Links must start with http:// or https://")
    .nullable()
    .default(null)
    .transform((u) => (u ? u : null)),
  isPublic: z.boolean().default(false),
});

export const ProfilePatchSchema = z.object({
  displayName: z.string().max(40).optional(),
  handle: z.string().max(24).optional(),
  minutesPerDay: z.number().int().min(5).max(240).optional(),
  timezone: z.string().max(60).optional(),
  privacy: z
    .object({
      passportPublic: z.boolean(),
      showDirection: z.boolean(),
      showSkills: z.boolean(),
      showAchievements: z.boolean(),
      showProjects: z.boolean(),
      showTimeline: z.boolean(),
      researchConsent: z.boolean(),
    })
    .partial()
    .optional(),
});

export const CoachSchema = z.object({
  message: z.string().trim().min(1).max(6000),
  mode: z.enum(["chat", "interview", "cv", "outreach", "plan", "portfolio", "change"]).optional(),
  missionId: z.string().max(120).nullish(),
});
