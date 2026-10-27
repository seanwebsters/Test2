/**
 * The Calm Studio design system. The dashboard's CSS variables and the game
 * runtime both read from here so studio and games feel like one family.
 */
export const palette = {
  ivory: "#F7F3EC",
  ivoryDeep: "#EFE8DC",
  midnight: "#14213D",
  midnightSoft: "#24324F",
  lavender: "#B9AEDC",
  coastal: "#7FA6C4",
  sage: "#9DB59A",
  peach: "#E9B79A",
  stone: "#8C8577",
} as const;

export const typography = {
  display: { family: "Fraunces", use: "Titles and moments of arrival", weights: [300, 400, 500] },
  text: { family: "Inter", use: "Interface, labels and body copy", weights: [400, 500, 600] },
  scale: [
    { name: "Display", size: "3.5rem", leading: 1.05, tracking: "-0.02em" },
    { name: "Title", size: "2rem", leading: 1.15, tracking: "-0.015em" },
    { name: "Heading", size: "1.25rem", leading: 1.3, tracking: "-0.01em" },
    { name: "Body", size: "0.95rem", leading: 1.6, tracking: "0" },
    { name: "Caption", size: "0.75rem", leading: 1.4, tracking: "0.08em" },
  ],
} as const;

/** Durations in ms. Calm motion is slow in, slower out; nothing snaps. */
export const timing = {
  touch: 180,
  settle: 420,
  reveal: 900,
  breathIn: 4000,
  breathOut: 6000,
  ambientLoop: 14000,
} as const;

export const easing = {
  calm: [0.22, 1, 0.36, 1],
  drift: [0.45, 0, 0.2, 1],
  breathe: [0.37, 0, 0.63, 1],
} as const;

export const transitions = [
  { id: "fade-rise", name: "Fade & rise", description: "Content fades in while drifting up 8px.", duration: timing.settle, easing: "calm" },
  { id: "dissolve", name: "Dissolve", description: "Cross-fade between scenes with no movement.", duration: timing.reveal, easing: "drift" },
  { id: "bloom", name: "Bloom", description: "Scale from 0.96 with a soft glow; used for rewards.", duration: timing.reveal, easing: "calm" },
  { id: "tide", name: "Tide", description: "A slow horizontal wash for level changes.", duration: 1400, easing: "breathe" },
] as const;

export const particlePresets = [
  { id: "fireflies", name: "Fireflies", description: "Warm points that wander and pulse." },
  { id: "petals", name: "Petals", description: "Soft ovals drifting down on a breeze." },
  { id: "dust", name: "Golden dust", description: "Fine motes rising through low light." },
  { id: "snow", name: "Snow", description: "Slow, sparse flakes." },
  { id: "stars", name: "Stars", description: "A still field that twinkles gently." },
  { id: "mist", name: "Mist", description: "Large translucent banks moving across the scene." },
] as const;

export const sounds = [
  { id: "touch", name: "Touch", description: "A soft sine pluck on the scale's root. Plays on every deliberate input." },
  { id: "connect", name: "Connect", description: "A rising fifth. Plays when something joins correctly." },
  { id: "miss", name: "Gentle miss", description: "A low, quiet tone. Never a buzzer." },
  { id: "complete", name: "Complete", description: "A slow four-note arpeggio with a long tail." },
] as const;

export const principles = [
  { title: "Sophisticated, not childish", body: "Editorial type, restrained colour, and real negative space." },
  { title: "Calming, not boring", body: "Every interaction has a satisfying response and a sense of progress." },
  { title: "Beautiful and rewarding", body: "Completion is a moment of light, colour and sound, not a score." },
  { title: "Soft, deliberate interaction", body: "Inputs are unhurried; animation eases rather than snaps." },
  { title: "No countdowns, no punishment", body: "Mistakes fade away gently. Nothing is lost and nothing wilts." },
  { title: "No intrusive monetisation", body: "No ads, no energy meters, and no upsell interruptions." },
  { title: "No clutter", body: "One focal point, a quiet HUD, and controls that appear when they're needed." },
] as const;

export const accessibilityRules = [
  "Text over game backgrounds reaches at least 4.5:1 contrast; validators flag palettes that don't.",
  "Every game is fully playable by keyboard (arrow keys to move focus, Enter or Space to act).",
  "Touch targets are at least 44×44 CSS pixels at mobile widths.",
  "prefers-reduced-motion removes ambient particles and shortens transitions.",
  "Progress and completion are announced through a polite live region.",
  "Colour is never the only signal: lit paths also glow and change thickness; stars show remaining-line pips.",
  "Sound is optional and off-by-default safe: the game is complete without it.",
] as const;

/** Curated palettes the Art Director can start from. */
export const stylePresets = [
  { id: "apricus-dusk", name: "Apricus Dusk", sky: ["#F6C9A0", "#E79D8A", "#7E6A9E"], accent: "#FFE2A8", ink: "#24213A" },
  { id: "tidal-morning", name: "Tidal Morning", sky: ["#E9F1EF", "#BFD8DA", "#86AFBF"], accent: "#F3C9A6", ink: "#1D2D3D" },
  { id: "sage-cloister", name: "Sage Cloister", sky: ["#EEF0E4", "#CFDCC3", "#9DB59A"], accent: "#F2D49B", ink: "#22302A" },
  { id: "midnight-observatory", name: "Midnight Observatory", sky: ["#0E1730", "#1D2A4F", "#3B3F6E"], accent: "#E8DDB5", ink: "#F3EEE2" },
  { id: "lavender-field", name: "Lavender Field", sky: ["#F3EFF8", "#D9D0EC", "#B9AEDC"], accent: "#E9B79A", ink: "#2A2540" },
] as const;
