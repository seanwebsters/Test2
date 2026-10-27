import type { AgentId } from "../types";

/** Display metadata for the six agents (safe for the browser). */
export const AGENTS: Record<AgentId, { name: string; role: string; short: string; tone: "lavender" | "coastal" | "sage" | "peach" | "midnight" | "rose"; color: string; responsibilities: string[] }> = {
  ideation: {
    name: "Ideation",
    role: "Creative Director",
    short: "Interprets the brief and invents an original concept with a clear emotional purpose.",
    tone: "lavender",
    color: "#B9AEDC",
    responsibilities: ["Interprets the prompt", "Invents the concept", "Names the emotional benefit", "Defines the core experience", "Suggests variations", "Checks it suits adults"],
  },
  design: {
    name: "Game Design",
    role: "Senior Game Designer",
    short: "Defines the mechanics, rules, progression, rewards and safeguards against stress.",
    tone: "coastal",
    color: "#7FA6C4",
    responsibilities: ["Defines mechanics", "Sets interaction rules", "Shapes progression", "Writes win conditions", "Designs feedback and rewards", "Keeps it stress-free"],
  },
  art: {
    name: "Art Direction",
    role: "Art Director",
    short: "Builds the palette, environment, motion and sound mood, and draws SVG motifs.",
    tone: "peach",
    color: "#E9B79A",
    responsibilities: ["Defines the palette", "Specifies the environment", "Designs visual elements", "Sets animation and transitions", "Draws SVG motifs", "Checks contrast"],
  },
  development: {
    name: "Development",
    role: "Senior Game Developer",
    short: "Writes the level layouts and content the tested game runtime executes, or freeform code.",
    tone: "sage",
    color: "#9DB59A",
    responsibilities: ["Builds the playable game", "Writes levels and layouts", "Respects engine rules", "Repairs QA failures", "Writes in-game copy", "Freeform code (experimental)"],
  },
  qa: {
    name: "Quality Assurance",
    role: "QA Engineer",
    short: "Plays the build in headless Chromium, checks errors, layout and accessibility, and requests repairs.",
    tone: "midnight",
    color: "#14213D",
    responsibilities: ["Loads it in Playwright", "Watches the console", "Plays every level", "Tests keyboard and mobile", "Checks accessibility", "Requests repairs"],
  },
  insights: {
    name: "Insights",
    role: "Product Analyst",
    short: "Reviews quality and real play sessions, separating evidence from hypotheses.",
    tone: "rose",
    color: "#C97B7B",
    responsibilities: ["Scores the game", "Reads play sessions", "Finds drop-off points", "Recommends improvements", "Proposes new concepts", "Labels evidence vs. opinion"],
  },
};
