export type Personality =
  | 'playful'
  | 'gentle'
  | 'curious'
  | 'brave'
  | 'cuddly'
  | 'cheeky'
  | 'sleepy'
  | 'social';

export type Favourite =
  | 'fetch'
  | 'walks'
  | 'sniffing'
  | 'swimming'
  | 'cuddles'
  | 'tug'
  | 'friends'
  | 'sunbathing'
  | 'tricks'
  | 'carrides';

export type Energy = 'gentle' | 'steady' | 'bouncy';
export type AgeGroup = 'puppy' | 'adult' | 'senior';

export type CoatId = 'golden' | 'cream' | 'honey' | 'chocolate' | 'black' | 'grey' | 'white' | 'ginger' | 'tan';
export type EarStyle = 'floppy' | 'pointy' | 'fold';
export type Pattern = 'none' | 'patch' | 'mask' | 'socks' | 'blaze';
export type HatId = 'none' | 'flowercrown' | 'beanie' | 'explorer' | 'wizard' | 'acorn' | 'crown' | 'bow';

export interface DogLook {
  coat: CoatId;
  ears: EarStyle;
  pattern: Pattern;
  bandana: string;
  hat: HatId;
}

export interface Dog {
  name: string;
  breed: string;
  ageYears: number;
  personality: Personality[];
  favourites: Favourite[];
  energy: Energy;
  photo?: string;
  look: DogLook;
  birthday?: string; // MM-DD
  adoptionDate?: string; // YYYY-MM-DD
}

export interface Profile {
  ownerName: string;
  islandName: string;
  dog: Dog;
  createdAt: number;
}

export type QuestCategory = 'explore' | 'senses' | 'train' | 'bond' | 'play' | 'calm';

export interface QuestDef {
  id: string;
  title: string;
  blurb: string;
  category: QuestCategory;
  minutes: number;
  /** who it suits */
  energy: Energy[];
  ages: AgeGroup[];
  favourite?: Favourite;
  tip: string;
}

export interface QuestInstance {
  defId: string;
  done: boolean;
  completedAt?: number;
}

export type ActivityType = 'quest' | 'walk' | 'lesson' | 'rest' | 'photo' | 'gift' | 'milestone' | 'cuddle';

export interface Activity {
  id: string;
  ts: number;
  type: ActivityType;
  title: string;
  detail?: string;
  category?: QuestCategory;
  minutes?: number;
  distanceKm?: number;
  discoveries?: string[];
  photo?: string;
  mood?: string;
  note?: string;
  sample?: boolean;
}

export type SceneKey = 'meadow' | 'woods' | 'sunset' | 'sofa' | 'beach' | 'park' | 'night';

export interface DiaryEntry {
  id: string;
  day: string; // YYYY-MM-DD
  title: string;
  body: string[];
  scene: SceneKey;
  props: string[];
  mood: string;
  saved: boolean;
  photo?: string;
  sample?: boolean;
}

export interface Placement {
  uid: string;
  itemId: string;
  x: number;
  y: number;
}

export type GardenKind = 'flower' | 'tree' | 'lantern' | 'crystal' | 'mushroom' | 'photo';

export interface GardenMemory {
  id: string;
  ts: number;
  kind: GardenKind;
  title: string;
  text: string;
  photo?: string;
  hue: number;
}

export interface SeedPlot {
  plot: number;
  plantedAt: number;
  boost: number; // minutes skipped thanks to activities
  species: 'moonbloom' | 'sunpetal' | 'starbell';
}

export interface AdventureRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  minutes: number;
  distanceKm: number;
  discoveries: string[];
  challenges: string[];
  coins: number;
  xp: number;
  usedGps: boolean;
}

export interface Friend {
  id: string;
  ownerName: string;
  islandName: string;
  dog: Dog;
  level: number;
  decorations: string[];
  status: string;
  online: boolean;
  giftedToday?: string; // day
  addedAt: number;
}

export interface Reward {
  coins?: number;
  xp?: number;
  seeds?: number;
  items?: string[];
  creature?: string;
  title?: string;
  subtitle?: string;
  kind?: 'quest' | 'walk' | 'lesson' | 'level' | 'gift' | 'harvest' | 'milestone' | 'unlock' | 'puzzle';
  stars?: number;
  maps?: number;
  moves?: number;
  booster?: BoosterId;
}

export type BoosterId = 'zoomies' | 'bone' | 'sniffer';

export interface PuzzleState {
  best: Record<string, number>; // level id -> best stars
  stars: number; // spendable stars
  starsEarned: number;
  maps: number; // treasure maps waiting
  mapsDone: number;
  bonusMoves: number;
  boosters: Record<BoosterId, number>;
}

export interface GameState {
  version: 1;
  profile: Profile | null;
  coins: number;
  seeds: number;
  xp: number;
  streak: { count: number; lastDay: string | null; best: number };
  questsDay: string;
  quests: QuestInstance[];
  restDays: string[];
  inventory: Record<string, number>;
  placed: Placement[];
  ownedHats: HatId[];
  creatures: string[];
  activities: Activity[];
  diary: DiaryEntry[];
  garden: GardenMemory[];
  plots: SeedPlot[];
  lessons: Record<string, number>; // lessonId -> stars
  tricks: string[];
  adventures: AdventureRecord[];
  friends: Friend[];
  sharedProgress: Record<string, number>;
  community: { week: string; contributed: number; claimed: number[] };
  plus: null | { plan: 'monthly' | 'yearly'; since: number };
  lastMailDay: string | null;
  timeMode: 'auto' | 'day' | 'sunset' | 'night';
  seenIntro: boolean;
  sound: boolean;
  puzzle: PuzzleState;
  restored: string[];
}
