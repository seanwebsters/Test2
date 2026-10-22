import type { Category, CategoryId, Topic } from "@/lib/types";

export const CATEGORIES: Category[] = [
  { id: "history", label: "History", blurb: "Empires, heists and the people who bent the timeline.", color: "#FF7768", color2: "#F7F4E9", deep: "#3A0F0A", glyph: "Ⅲ" },
  { id: "psychology", label: "Psychology", blurb: "Why your brain does the weird things it does.", color: "#FF92C7", color2: "#B6A1FF", deep: "#3B0D27", glyph: "◉" },
  { id: "science", label: "Science", blurb: "The universe's rulebook, read out loud.", color: "#DFFF57", color2: "#587BFF", deep: "#1F2A05", glyph: "✳" },
  { id: "finance", label: "Finance", blurb: "Money, explained like someone actually likes you.", color: "#7CF2A6", color2: "#DFFF57", deep: "#0B2E1F", glyph: "£" },
  { id: "business", label: "Business", blurb: "Cult brands, wild founders and spectacular failures.", color: "#587BFF", color2: "#FFB547", deep: "#0E1640", glyph: "▲" },
  { id: "technology", label: "Technology", blurb: "The invisible machines running your life.", color: "#57E3FF", color2: "#587BFF", deep: "#062F38", glyph: "⌘" },
  { id: "culture", label: "Culture", blurb: "Trends, music, fashion and the internet's chaos.", color: "#FFB547", color2: "#FF92C7", deep: "#3D2306", glyph: "✦" },
  { id: "philosophy", label: "Philosophy", blurb: "Big questions. Tiny episodes. Zero homework.", color: "#B6A1FF", color2: "#F7F4E9", deep: "#1F1640", glyph: "∞" },
  { id: "space", label: "Space", blurb: "Everything above the sky, and why it's terrifying.", color: "#8EA4FF", color2: "#DFFF57", deep: "#0A0E2E", glyph: "☾" },
  { id: "creativity", label: "Creativity", blurb: "How ideas actually happen.", color: "#FF9A57", color2: "#FF7768", deep: "#3A1806", glyph: "✎" },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

const t = (id: string, label: string, category: CategoryId, parent?: string, related?: string[]): Topic => ({ id, label, category, parent, related });

/**
 * The knowledge graph. Every topic here is referenced by at least one episode, so
 * the universe only ever shows stars that real content can light up.
 */
export const TOPICS: Topic[] = [
  // History
  t("ancient-rome", "Ancient Rome", "history"),
  t("roman-engineering", "Roman Engineering", "history", "ancient-rome", ["engineering-scale"]),
  t("roman-architecture", "Architecture", "history", "roman-engineering"),
  t("modern-cities", "Modern Cities", "history", "roman-architecture", ["internet-infrastructure"]),
  t("roman-politics", "Power & Politics", "history", "ancient-rome", ["influence"]),
  t("currency-debasement", "Currency Debasement", "history", "roman-politics", ["inflation"]),
  t("byzantium", "Byzantium", "history", "ancient-rome"),
  t("heists", "Great Heists", "history", undefined, ["security"]),
  t("game-changers", "Game Changers", "history"),
  t("printing", "The Printing Press", "history", "game-changers", ["information-tech"]),
  t("everyday-history", "History of Stuff", "history"),
  t("salt", "Salt & Trade", "history", "everyday-history", ["trade-economics"]),

  // Psychology
  t("the-brain", "The Brain", "psychology"),
  t("memory", "Memory", "psychology", "the-brain"),
  t("biases", "Cognitive Biases", "psychology", "the-brain", ["decision-making"]),
  t("habits", "Habits", "psychology", "the-brain"),
  t("procrastination", "Procrastination", "psychology", "habits"),
  t("love", "Love & Attraction", "psychology"),
  t("love-chemistry", "Love Chemistry", "psychology", "love", ["neuroscience"]),
  t("attraction", "Attraction", "psychology", "love"),
  t("influence", "Influence", "psychology", undefined, ["brands-cults"]),
  t("reciprocity", "Reciprocity", "psychology", "influence", ["negotiation"]),
  t("sleep-dreams", "Sleep & Dreams", "psychology", "the-brain", ["neuroscience"]),

  // Science
  t("human-body", "The Human Body", "science"),
  t("neuroscience", "Neuroscience", "science", "human-body"),
  t("weird-biology", "Weird Biology", "science", "human-body"),
  t("chemistry-everyday", "Everyday Chemistry", "science"),
  t("future-tech", "The Future", "science", undefined, ["ai"]),
  t("longevity", "Longevity", "science", "future-tech", ["human-body"]),
  t("animal-behaviour", "Animal Behaviour", "science"),

  // Finance
  t("money-basics", "Money Basics", "finance"),
  t("inflation", "Inflation", "finance", "money-basics"),
  t("compound-interest", "Compound Interest", "finance", "money-basics"),
  t("investing", "Investing", "finance"),
  t("index-funds", "Index Funds", "finance", "investing"),
  t("wealth", "How Wealth Works", "finance", undefined, ["startups"]),
  t("equity", "Equity & Ownership", "finance", "wealth"),
  t("everyday-economics", "Everyday Economics", "finance"),
  t("pricing", "Pricing Psychology", "finance", "everyday-economics", ["biases"]),
  t("trade-economics", "Trade", "finance", "everyday-economics"),
  t("credit", "Credit & Debt", "finance", "money-basics"),

  // Business
  t("brands-cults", "Cult Brands", "business"),
  t("scarcity", "Scarcity Marketing", "business", "brands-cults", ["trend-cycles"]),
  t("startups", "Startups", "business"),
  t("bootstrapping", "Hustle Stories", "business", "startups"),
  t("negotiation", "Negotiation", "business"),
  t("anchoring", "Anchoring", "business", "negotiation", ["biases"]),
  t("failure", "Business Failure", "business", undefined, ["streaming"]),
  t("scams", "Scams & Cons", "business", undefined, ["heists"]),
  t("ponzi", "Ponzi Schemes", "business", "scams", ["investing"]),
  t("decision-making", "Decision Making", "business"),

  // Technology
  t("internet-infrastructure", "How the Internet Works", "technology"),
  t("dns", "DNS & Packets", "technology", "internet-infrastructure"),
  t("information-tech", "Information", "technology"),
  t("ai", "Artificial Intelligence", "technology"),
  t("neural-networks", "Neural Networks", "technology", "ai", ["neuroscience"]),
  t("gps", "GPS", "technology", "information-tech", ["relativity"]),
  t("security", "Security", "technology"),
  t("engineering-scale", "Engineering at Scale", "technology"),

  // Culture
  t("trend-cycles", "Trend Cycles", "culture"),
  t("fashion", "Fashion", "culture", "trend-cycles"),
  t("music-business", "Music Business", "culture", undefined, ["equity"]),
  t("streaming", "Streaming", "culture", "music-business"),
  t("film-sound", "Film & Sound", "culture", undefined, ["constraints"]),

  // Philosophy
  t("identity", "Identity", "philosophy"),
  t("thought-experiments", "Thought Experiments", "philosophy", "identity"),
  t("stoicism", "Stoicism", "philosophy", undefined, ["habits"]),
  t("control", "What You Control", "philosophy", "stoicism"),
  t("time-perception", "Time", "philosophy", undefined, ["memory"]),

  // Space
  t("black-holes", "Black Holes", "space"),
  t("relativity", "Relativity", "space", "black-holes"),
  t("solar-system", "The Solar System", "space"),
  t("sun", "The Sun", "space", "solar-system"),
  t("planets", "Weird Planets", "space", "solar-system"),
  t("astronauts", "Life in Space", "space", undefined, ["human-body"]),
  t("cosmic-scale", "Cosmic Scale", "space"),

  // Creativity
  t("creative-process", "Creative Process", "creativity"),
  t("constraints", "Constraints", "creativity", "creative-process"),
  t("making-of", "The Making Of", "creativity"),
  t("sound-design", "Sound Design", "creativity", "making-of", ["film-sound"]),
];

export const TOPIC_BY_ID: Record<string, Topic> = Object.fromEntries(TOPICS.map((x) => [x.id, x]));
