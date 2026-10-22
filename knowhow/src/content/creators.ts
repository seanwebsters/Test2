import type { Creator } from "@/lib/types";

/**
 * Host personas. Every KNOWHOW Original in the seed library is written by the
 * KNOWHOW editorial team and narrated with an AI voice (Kokoro TTS). The hosts
 * are named personas for those voices, and the UI says so.
 */
export const CREATORS = {
  theo: { name: "Theo Marsh", handle: "theomarsh", bio: "History nerd with a soft spot for disasters. Believes every empire falls for a boring reason.", voice: "bm_george" },
  ada: { name: "Ada Okafor", handle: "ada.explains", bio: "Makes money make sense. Formerly confused by pensions, now dangerously enthusiastic about them.", voice: "af_heart" },
  priya: { name: "Priya Nair", handle: "priyathinks", bio: "Psychology obsessive. Will explain your weird habits to you, kindly.", voice: "bf_emma" },
  jonah: { name: "Jonah Reyes", handle: "jonahreyes", bio: "Space, physics and the stuff that keeps you up at night.", voice: "am_michael" },
  mina: { name: "Mina Park", handle: "minaparkk", bio: "Culture, trends and the internet's strangest corners.", voice: "af_bella" },
  leo: { name: "Leo Varga", handle: "leovarga", bio: "Business stories, told like heist films.", voice: "bm_fable" },
  sol: { name: "Sol Adeyemi", handle: "sol.adeyemi", bio: "Philosophy for people who don't like philosophy. Yet.", voice: "am_fenrir" },
  kit: { name: "Kit Moreno", handle: "kitmoreno", bio: "Tech explainer. Takes apart the machines you use every day.", voice: "am_puck" },
} satisfies Record<string, Creator>;
