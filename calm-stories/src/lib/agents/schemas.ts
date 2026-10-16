import { z } from "zod";

export const EpisodePlanSchema = z.object({
  title: z.string().describe("Episode title, 2–6 words"),
  summary: z.string().describe("One or two sentences listeners see on the series page"),
  beats: z.array(z.string()).describe("4–7 gentle story beats in order"),
  ambience_prompt: z.string().describe("Prompt for a seamless, looping background ambience: natural sounds only, no voices, no sudden sounds"),
  art_prompt: z.string().describe("Prompt for the episode artwork: one calm, atmospheric scene, no text or lettering"),
});
export type EpisodePlan = z.infer<typeof EpisodePlanSchema>;

export const SoftenSchema = z.object({
  script: z.string().describe("The full revised script"),
  changes: z.array(z.string()).describe("Short list of what was softened"),
});
