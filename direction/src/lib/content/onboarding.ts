import type { ValueKey, WorkMode } from "./types";

/** Interest signals. Careers list the interests that should pull them up. */
export const INTERESTS: { id: string; label: string; emoji: string }[] = [
  { id: "art", label: "Art & drawing", emoji: "🎨" },
  { id: "design", label: "Design", emoji: "✏️" },
  { id: "tech", label: "Tech & coding", emoji: "💻" },
  { id: "ai", label: "AI", emoji: "🤖" },
  { id: "games", label: "Gaming", emoji: "🎮" },
  { id: "business", label: "Business ideas", emoji: "💡" },
  { id: "money", label: "Money & investing", emoji: "💷" },
  { id: "film", label: "Film & TV", emoji: "🎬" },
  { id: "music", label: "Music", emoji: "🎧" },
  { id: "fashion", label: "Fashion", emoji: "👟" },
  { id: "social-media", label: "Social media", emoji: "📱" },
  { id: "writing", label: "Writing & stories", emoji: "📝" },
  { id: "photography", label: "Photography", emoji: "📸" },
  { id: "performing", label: "Performing", emoji: "🎭" },
  { id: "health", label: "Health & medicine", emoji: "🩺" },
  { id: "science", label: "Science", emoji: "🔬" },
  { id: "space", label: "Space", emoji: "🚀" },
  { id: "nature", label: "Nature & climate", emoji: "🌱" },
  { id: "animals", label: "Animals", emoji: "🐾" },
  { id: "building", label: "Building & making", emoji: "🛠️" },
  { id: "cars", label: "Cars & machines", emoji: "🏎️" },
  { id: "sport", label: "Sport", emoji: "⚽" },
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "justice", label: "Justice & rights", emoji: "⚖️" },
  { id: "debate", label: "Debating", emoji: "🗣️" },
  { id: "politics", label: "Politics & society", emoji: "🏛️" },
  { id: "teaching", label: "Teaching others", emoji: "📚" },
  { id: "kids", label: "Working with kids", emoji: "🧸" },
  { id: "community", label: "Helping my community", emoji: "🤝" },
  { id: "food", label: "Food & cooking", emoji: "🍜" },
  { id: "travel", label: "Travel", emoji: "✈️" },
];

/** Scenario cards for the swipe game. Swiping right adds these signals. */
export interface SwipeCard {
  id: string;
  title: string;
  scene: string;
  emoji: string;
  accent: "teal" | "coral" | "lavender" | "sun" | "mint";
  interests: string[];
  modes: Partial<Record<WorkMode, number>>;
}

export const SWIPE_CARDS: SwipeCard[] = [
  { id: "festival-poster", title: "Designing a festival poster", scene: "Your art on every wall in the city.", emoji: "🎪", accent: "coral", interests: ["art", "design", "music"], modes: { create: 1 } },
  { id: "app-bug", title: "Fixing the bug that crashed an app", scene: "Millions of users, one tricky line of code.", emoji: "🐞", accent: "teal", interests: ["tech", "games"], modes: { solve: 1 } },
  { id: "patient", title: "Calming a nervous patient", scene: "You make someone's worst day a little easier.", emoji: "🫶", accent: "mint", interests: ["health", "community"], modes: { help: 1 } },
  { id: "pitch-room", title: "Pitching your idea to investors", scene: "Five minutes. One shot. Big stakes.", emoji: "💼", accent: "sun", interests: ["business", "money"], modes: { lead: 1 } },
  { id: "music-video", title: "Directing a music video shoot", scene: "Lights, camera, your vision.", emoji: "🎥", accent: "lavender", interests: ["film", "music"], modes: { create: 1, lead: 0.5 } },
  { id: "lab", title: "Running an experiment nobody's tried", scene: "If it works, it changes everything.", emoji: "🧪", accent: "teal", interests: ["science", "health"], modes: { solve: 1 } },
  { id: "classroom", title: "Seeing a kid finally 'get it'", scene: "The lightbulb moment you made happen.", emoji: "💡", accent: "mint", interests: ["teaching", "kids"], modes: { help: 1 } },
  { id: "courtroom", title: "Winning an argument in court", scene: "The evidence is on your side.", emoji: "⚖️", accent: "lavender", interests: ["justice", "debate"], modes: { solve: 0.5, lead: 0.5 } },
  { id: "brand-launch", title: "Launching a brand on TikTok", scene: "Your campaign goes viral overnight.", emoji: "📈", accent: "coral", interests: ["social-media", "business", "fashion"], modes: { create: 1 } },
  { id: "bridge", title: "Designing a bridge that will last 100 years", scene: "Steel, maths and something beautiful.", emoji: "🌉", accent: "sun", interests: ["building", "science"], modes: { solve: 1, create: 0.5 } },
  { id: "match-day", title: "Coaching a team on match day", scene: "Final minutes. Your tactics. Their moment.", emoji: "🏟️", accent: "teal", interests: ["sport", "fitness"], modes: { lead: 1, help: 0.5 } },
  { id: "kitchen", title: "Running a busy restaurant kitchen", scene: "Heat, pace and plates people love.", emoji: "🔥", accent: "coral", interests: ["food", "business"], modes: { lead: 1, create: 0.5 } },
  { id: "climate-data", title: "Using data to fight climate change", scene: "Numbers that could change policy.", emoji: "🌍", accent: "mint", interests: ["nature", "science", "tech", "politics"], modes: { solve: 1 } },
  { id: "runway", title: "Watching your designs on a runway", scene: "Months of work, ninety seconds of magic.", emoji: "👗", accent: "lavender", interests: ["fashion", "art"], modes: { create: 1 } },
  { id: "ai-model", title: "Teaching an AI to spot disease early", scene: "Code that might save lives.", emoji: "🧠", accent: "teal", interests: ["ai", "tech", "health"], modes: { solve: 1, help: 0.5 } },
  { id: "community-project", title: "Starting a project for your neighbourhood", scene: "Getting people together to fix something real.", emoji: "🏘️", accent: "sun", interests: ["community", "politics"], modes: { lead: 1, help: 1 } },
];

/** "This or that" pairs. Each side nudges work modes, social preference or values. */
export interface ThisOrThat {
  id: string;
  a: { label: string; emoji: string; modes?: Partial<Record<WorkMode, number>>; social?: number; values?: Partial<Record<ValueKey, number>> };
  b: { label: string; emoji: string; modes?: Partial<Record<WorkMode, number>>; social?: number; values?: Partial<Record<ValueKey, number>> };
}

export const THIS_OR_THAT: ThisOrThat[] = [
  { id: "make-fix", a: { label: "Make something new", emoji: "🎨", modes: { create: 1 } }, b: { label: "Fix something broken", emoji: "🔧", modes: { solve: 1 } } },
  { id: "help-lead", a: { label: "Help one person a lot", emoji: "🫶", modes: { help: 1 } }, b: { label: "Lead a whole team", emoji: "🧭", modes: { lead: 1 } } },
  { id: "solo-team", a: { label: "Headphones on, deep focus", emoji: "🎧", social: 0 }, b: { label: "Buzzing room full of people", emoji: "🎉", social: 1 } },
  { id: "safe-bold", a: { label: "A steady path I can count on", emoji: "🏡", values: { stability: 1 } }, b: { label: "A bold bet that might pay off big", emoji: "🎲", values: { money: 0.5, flexibility: 0.5 } } },
  { id: "idea-plan", a: { label: "Dream up the idea", emoji: "✨", modes: { create: 1 }, values: { creativity: 0.5 } }, b: { label: "Make the plan happen", emoji: "📋", modes: { lead: 0.5, solve: 0.5 } } },
  { id: "screen-world", a: { label: "Work on a screen", emoji: "💻", modes: { solve: 0.5 } }, b: { label: "Work out in the world", emoji: "🌍", social: 0.6, modes: { help: 0.5 } } },
];

export const SUBJECTS: { id: string; label: string; interests: string[] }[] = [
  { id: "art", label: "Art & Design", interests: ["art", "design"] },
  { id: "english", label: "English", interests: ["writing"] },
  { id: "maths", label: "Maths", interests: ["money", "science", "tech"] },
  { id: "computing", label: "Computing", interests: ["tech", "ai", "games"] },
  { id: "biology", label: "Biology", interests: ["health", "science", "animals", "nature"] },
  { id: "chemistry", label: "Chemistry", interests: ["science", "health"] },
  { id: "physics", label: "Physics", interests: ["science", "space", "building"] },
  { id: "business", label: "Business", interests: ["business", "money"] },
  { id: "economics", label: "Economics", interests: ["money", "politics"] },
  { id: "media", label: "Media & Film", interests: ["film", "social-media"] },
  { id: "music", label: "Music", interests: ["music", "performing"] },
  { id: "drama", label: "Drama", interests: ["performing", "film"] },
  { id: "pe", label: "PE & Sport", interests: ["sport", "fitness"] },
  { id: "history", label: "History", interests: ["writing", "politics"] },
  { id: "geography", label: "Geography", interests: ["nature", "travel"] },
  { id: "psychology", label: "Psychology", interests: ["health", "community"] },
  { id: "law", label: "Law & Politics", interests: ["justice", "debate", "politics"] },
  { id: "languages", label: "Languages", interests: ["travel", "writing"] },
  { id: "dt", label: "Design & Technology", interests: ["building", "design", "cars"] },
  { id: "food", label: "Food & Nutrition", interests: ["food", "health"] },
];

export const LIFESTYLES: { id: string; title: string; detail: string; emoji: string; values: Partial<Record<ValueKey, number>>; social?: number }[] = [
  { id: "studio", title: "Studio life", detail: "Making things I'm proud of, with people I like.", emoji: "🎨", values: { creativity: 1 } },
  { id: "high-flyer", title: "City high-flyer", detail: "Big goals, big rewards, fast pace.", emoji: "🏙️", values: { money: 1 }, social: 0.8 },
  { id: "free", title: "Laptop & passport", detail: "Work from anywhere, on my own terms.", emoji: "🌴", values: { flexibility: 1 }, social: 0.2 },
  { id: "grounded", title: "Steady & grounded", detail: "Security, balance and time for life outside work.", emoji: "🏡", values: { stability: 1 } },
  { id: "changemaker", title: "Changemaker", detail: "Work that makes the world measurably better.", emoji: "🌍", values: { impact: 1 } },
];

export const VALUE_LABELS: Record<ValueKey, { label: string; emoji: string; detail: string }> = {
  money: { label: "Money", emoji: "💷", detail: "Earning well" },
  creativity: { label: "Creativity", emoji: "🎨", detail: "Making original things" },
  stability: { label: "Stability", emoji: "🛟", detail: "Security and routine" },
  flexibility: { label: "Flexibility", emoji: "🌀", detail: "Freedom over time and place" },
  impact: { label: "Impact", emoji: "🌍", detail: "Making a difference" },
};

export const STATUSES = [
  { id: "school", label: "At school or college" },
  { id: "university", label: "At university" },
  { id: "employed", label: "Working" },
  { id: "unemployed", label: "Looking for work" },
  { id: "exploring", label: "Exploring something new" },
] as const;

export type StatusId = (typeof STATUSES)[number]["id"];

export const TIME_OPTIONS = [
  { minutes: 5, label: "5 min", detail: "A quick daily nudge" },
  { minutes: 15, label: "15 min", detail: "Steady progress" },
  { minutes: 30, label: "30 min", detail: "Serious about it" },
  { minutes: 60, label: "60 min+", detail: "All in" },
] as const;

export const COUNTRIES = ["United Kingdom", "Ireland", "United States", "Canada", "Australia", "Other"] as const;
