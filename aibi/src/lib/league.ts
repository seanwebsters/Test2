import { hashString, seeded, weekKey, weekProgress } from "./date";

// Weekly leagues. In this local-first prototype, fellow learners are simulated
// deterministically per week so the board feels alive and fair; the shape
// matches what a real leaderboard API would return.

const NAMES = [
  ["Amara", "🦊", "#FF7A70"], ["Ben", "🐻", "#4FB2FF"], ["Chloe", "🐼", "#7C4DFF"], ["Dev", "🦁", "#FFC53D"],
  ["Ellie", "🐨", "#4CD47E"], ["Farah", "🦄", "#FF6FB5"], ["George", "🐸", "#2DBE63"], ["Hana", "🐱", "#F5A70B"],
  ["Isaac", "🐯", "#F5564A"], ["Jade", "🐰", "#BCA3FF"], ["Kofi", "🐵", "#2696F0"], ["Lily", "🦋", "#9C77FF"],
  ["Mo", "🐧", "#4A3F6B"], ["Nina", "🐙", "#F0479A"], ["Oscar", "🐶", "#22A152"], ["Priya", "🌸", "#FF6FB5"],
  ["Quinn", "🐳", "#4FB2FF"], ["Ravi", "🦉", "#857BA3"], ["Sophie", "🐢", "#4CD47E"], ["Tom", "🐲", "#5726CC"],
];

export const LEAGUES = [
  { name: "Lavender", color: "#BCA3FF", icon: "🪻" },
  { name: "Amethyst", color: "#7C4DFF", icon: "💜" },
  { name: "Sapphire", color: "#2696F0", icon: "💎" },
  { name: "Emerald", color: "#2DBE63", icon: "💚" },
  { name: "Gold", color: "#F5A70B", icon: "🏆" },
];

export function leagueFor(level: number) {
  return LEAGUES[Math.min(LEAGUES.length - 1, Math.floor((level - 1) / 3))];
}

export interface Row {
  id: string;
  name: string;
  avatar: string;
  color: string;
  xp: number;
  you?: boolean;
}

export function leaderboard(youName: string, youXp: number, level: number, now = new Date()): Row[] {
  const wk = weekKey(now);
  const rnd = seeded(hashString(wk + level));
  const pool = [...NAMES].sort(() => rnd() - 0.5).slice(0, 14);
  const progress = Math.max(0.04, weekProgress(now));
  const scale = 60 + level * 25;
  const rows: Row[] = pool.map(([name, avatar, color], i) => {
    const r = seeded(hashString(wk + name))();
    const pace = 0.25 + r * 1.6 + (i < 3 ? 0.6 : 0);
    return { id: name, name, avatar, color, xp: Math.round(scale * 7 * pace * progress * (0.85 + 0.3 * rnd())) };
  });
  rows.push({ id: "you", name: youName || "You", avatar: "🤖", color: "#7C4DFF", xp: youXp, you: true });
  return rows.sort((a, b) => b.xp - a.xp || (a.you ? -1 : 1));
}

export function timeLeftInWeek(now = new Date()): string {
  const end = new Date(now);
  const dow = (now.getDay() + 6) % 7;
  end.setDate(now.getDate() + (7 - dow));
  end.setHours(0, 0, 0, 0);
  const ms = end.getTime() - now.getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}
