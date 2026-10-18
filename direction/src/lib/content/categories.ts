import type { Category, CategoryId } from "./types";

export const CATEGORIES: Category[] = [
  { id: "creative", name: "Creative & Design", blurb: "Shape how the world looks, feels and works.", accent: "coral", emoji: "🎨" },
  { id: "business", name: "Business & Entrepreneurship", blurb: "Build things people want and the teams that make them.", accent: "sun", emoji: "🚀" },
  { id: "tech", name: "Technology & AI", blurb: "Write the software and systems the future runs on.", accent: "teal", emoji: "💻" },
  { id: "film", name: "Film & Entertainment", blurb: "Tell stories on screens big and small.", accent: "lavender", emoji: "🎬" },
  { id: "music", name: "Music", blurb: "Make, produce and champion the sound of a generation.", accent: "coral", emoji: "🎧" },
  { id: "fashion", name: "Fashion", blurb: "Design, style and sell what people wear.", accent: "lavender", emoji: "🧵" },
  { id: "marketing", name: "Marketing & Media", blurb: "Get ideas noticed, shared and remembered.", accent: "sun", emoji: "📣" },
  { id: "finance", name: "Finance", blurb: "Move money to where it can do the most.", accent: "mint", emoji: "📈" },
  { id: "healthcare", name: "Healthcare", blurb: "Look after people when it matters most.", accent: "teal", emoji: "🩺" },
  { id: "science", name: "Science", blurb: "Ask big questions and prove the answers.", accent: "mint", emoji: "🔬" },
  { id: "engineering", name: "Engineering", blurb: "Design and build the physical world.", accent: "sun", emoji: "⚙️" },
  { id: "sports", name: "Sports", blurb: "Performance, coaching and the business of sport.", accent: "coral", emoji: "🏟️" },
  { id: "law", name: "Law", blurb: "Argue, advise and protect people's rights.", accent: "lavender", emoji: "⚖️" },
  { id: "education", name: "Education", blurb: "Help people learn and grow.", accent: "mint", emoji: "📚" },
  { id: "hospitality", name: "Hospitality", blurb: "Create experiences people remember.", accent: "sun", emoji: "🍽️" },
  { id: "public", name: "Public Service", blurb: "Serve communities and shape society.", accent: "teal", emoji: "🏛️" },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): Category {
  const c = byId.get(id);
  if (!c) throw new Error(`Unknown category ${id}`);
  return c;
}
