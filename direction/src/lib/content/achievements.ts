export interface AchievementStats {
  missionsCompleted: number;
  careersViewed: number;
  projectsCompleted: number;
  connections: number;
  portfolioPieces: number;
  interviewPrep: number;
  applications: number;
  opportunitiesSecured: number;
  longestStreak: number;
  levelsCompleted: number;
  pathsStarted: number;
  coachConversations: number;
  challengeDays: number;
  questsCompleted: number;
  skillsAtCapable: number;
  reflections: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  accent: "teal" | "coral" | "lavender" | "sun" | "mint";
  xp: number;
  /** Returns progress 0–1; unlocked at 1. */
  progress: (s: AchievementStats) => number;
  /** Short hint for locked achievements. */
  hint: string;
}

const ratio = (v: number, target: number) => Math.min(1, v / target);

/**
 * Achievements reward genuine accomplishment, courage, curiosity and consistency.
 * There are no public leaderboards: achievements are personal.
 */
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-step", name: "First Step", description: "Complete your first mission.", emoji: "👣", accent: "teal", xp: 10, hint: "Finish any mission.", progress: (s) => ratio(s.missionsCompleted, 1) },
  { id: "explorer", name: "Explorer", description: "Investigate five careers.", emoji: "🧭", accent: "lavender", xp: 15, hint: "Open five career profiles.", progress: (s) => ratio(s.careersViewed, 5) },
  { id: "creator", name: "Creator", description: "Finish your first project.", emoji: "🛠️", accent: "coral", xp: 25, hint: "Complete a project mission with evidence.", progress: (s) => ratio(s.projectsCompleted, 1) },
  { id: "connector", name: "Connector", description: "Make your first professional connection.", emoji: "🤝", accent: "sun", xp: 25, hint: "Complete a mission where you reach out to someone.", progress: (s) => ratio(s.connections, 1) },
  { id: "portfolio-builder", name: "Portfolio Builder", description: "Complete three portfolio pieces.", emoji: "🗂️", accent: "coral", xp: 40, hint: "Complete three portfolio missions.", progress: (s) => ratio(s.portfolioPieces, 3) },
  { id: "interview-ready", name: "Interview Ready", description: "Complete interview preparation.", emoji: "🎤", accent: "lavender", xp: 40, hint: "Complete two interview practice missions.", progress: (s) => ratio(s.interviewPrep, 2) },
  { id: "first-break", name: "First Break", description: "Secure your first relevant opportunity.", emoji: "🌟", accent: "sun", xp: 100, hint: "Mark a tracked opportunity as secured.", progress: (s) => ratio(s.opportunitiesSecured, 1) },
  { id: "brave-apply", name: "Shot Taker", description: "Send your first application.", emoji: "📮", accent: "teal", xp: 30, hint: "Mark an opportunity as applied.", progress: (s) => ratio(s.applications, 1) },
  { id: "week-warrior", name: "Seven Days Strong", description: "Reach a 7-day streak.", emoji: "🔥", accent: "coral", xp: 30, hint: "Make progress seven days in a row.", progress: (s) => ratio(s.longestStreak, 7) },
  { id: "month-of-momentum", name: "Month of Momentum", description: "Reach a 30-day streak.", emoji: "🌋", accent: "coral", xp: 100, hint: "Make progress 30 days in a row.", progress: (s) => ratio(s.longestStreak, 30) },
  { id: "level-up", name: "Level Up", description: "Complete your first path level.", emoji: "⛰️", accent: "mint", xp: 30, hint: "Finish a level quest.", progress: (s) => ratio(s.levelsCompleted, 1) },
  { id: "halfway", name: "Halfway There", description: "Complete five path levels.", emoji: "🏔️", accent: "mint", xp: 80, hint: "Finish five level quests.", progress: (s) => ratio(s.levelsCompleted, 5) },
  { id: "curious-mind", name: "Curious Mind", description: "Try missions from two different paths.", emoji: "🔭", accent: "lavender", xp: 20, hint: "Start a second path or the discovery challenge.", progress: (s) => ratio(s.pathsStarted, 2) },
  { id: "deep-talk", name: "Mentor Moment", description: "Have three conversations with your coach.", emoji: "💬", accent: "teal", xp: 15, hint: "Chat with Pip three times.", progress: (s) => ratio(s.coachConversations, 3) },
  { id: "challenge-7", name: "Taste Tester", description: "Complete 7 days of the Discovery Challenge.", emoji: "🍱", accent: "sun", xp: 40, hint: "Keep going with the 30-Day Discovery Challenge.", progress: (s) => ratio(s.challengeDays, 7) },
  { id: "challenge-30", name: "Direction Found", description: "Complete the 30-Day Discovery Challenge.", emoji: "🏁", accent: "sun", xp: 150, hint: "Finish all 30 days.", progress: (s) => ratio(s.challengeDays, 30) },
  { id: "quest-3", name: "Quest Hunter", description: "Complete three level quests.", emoji: "🗝️", accent: "mint", xp: 40, hint: "Finish three quests.", progress: (s) => ratio(s.questsCompleted, 3) },
  { id: "capable", name: "Getting Good", description: "Reach 'Capable' in any skill.", emoji: "📐", accent: "teal", xp: 40, hint: "Keep building one skill.", progress: (s) => ratio(s.skillsAtCapable, 1) },
  { id: "reflective", name: "Reflective", description: "Write five reflections.", emoji: "🪞", accent: "lavender", xp: 20, hint: "Add a reflection when you finish missions.", progress: (s) => ratio(s.reflections, 5) },
  { id: "ten-missions", name: "Momentum", description: "Complete ten missions.", emoji: "⚡", accent: "sun", xp: 30, hint: "Complete ten missions.", progress: (s) => ratio(s.missionsCompleted, 10) },
  { id: "fifty-missions", name: "Unstoppable", description: "Complete fifty missions.", emoji: "🚀", accent: "coral", xp: 120, hint: "Complete fifty missions.", progress: (s) => ratio(s.missionsCompleted, 50) },
];

const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
export function getAchievement(id: string) {
  return byId.get(id);
}
