import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CAREER_BY_ID } from '../data/careers';
import { ACHIEVEMENTS, QUEST_POOL, levelFromXp, type QuestKind } from '../data/gamification';
import { DEMO_PARTNERS } from '../data/partners';
import { FEATURED_SIMS } from '../sims';
import { TRAITS, type HatId, type SkillId, type Trait, type WorldId } from '../data/types';

export type Enjoy = 1 | 2 | 3;
export interface Activity {
  id: string;
  kind: 'sim' | 'lesson' | 'episode';
  ref: string; // sim id, career id (lesson) or episode id
  world: WorldId;
  careerId?: string;
  xp: number;
  score: number; // 0..1
  enjoy: Enjoy | null;
  skills: SkillId[];
  at: number;
}
export interface ChatMsg { id: string; from: 'scout' | 'me'; text: string; chips?: Chip[] }
export type Chip =
  | { label: string; kind: 'career'; id: string }
  | { label: string; kind: 'sim'; id: string }
  | { label: string; kind: 'ask'; text: string }
  | { label: string; kind: 'roadmap'; id?: string }
  | { label: string; kind: 'world'; id: string };
export interface Goal { id: string; text: string; horizon: 'short' | 'long'; done: boolean; at: number }
export interface Profile { name: string; age: number; stage: string; answers: Record<string, string[]>; createdAt: number }

type Vec = Record<Trait, number>;
type WVec = Record<WorldId, number>;
const zeroT = (): Vec => Object.fromEntries(TRAITS.map((t) => [t, 0])) as Vec;

export const today = (d = new Date()) => d.toISOString().slice(0, 10);
const weekKey = (d = new Date()) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${Math.ceil(((+t - +y) / 86400000 + 1) / 7)}`;
};
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const dailyQuestIds = (day: string) => {
  const pool = [...QUEST_POOL];
  const out: string[] = [];
  let h = hash(day);
  while (out.length < 3) { const i = h % pool.length; out.push(pool.splice(i, 1)[0].id); h = hash(String(h)); }
  return out;
};
const uid = () => Math.random().toString(36).slice(2, 10);

export interface Reward { xp: number; sparks: number; levelUp: number | null; achievements: string[]; keys: number }

interface State {
  onboarded: boolean;
  profile: Profile | null;
  traits: Vec;
  worldAff: Partial<WVec>;
  baseline: { traits: Vec; worldAff: Partial<WVec> } | null;
  xp: number;
  sparks: number;
  keys: number;
  streak: { count: number; best: number; last: string | null };
  activities: Activity[];
  skillPts: Partial<Record<SkillId, number>>;
  saved: string[];
  viewed: string[];
  unlockedWorlds: WorldId[];
  claimedNodes: string[];
  episodeProg: Record<string, number>;
  chat: ChatMsg[];
  chatCount: number;
  hats: HatId[];
  hat: HatId;
  achievements: Record<string, number>;
  toasts: { id: string; achievement?: string; text?: string }[];
  daily: { day: string; quests: { id: string; progress: number; claimed: boolean }[] };
  weekly: { week: string; worlds: WorldId[]; claimed: boolean };
  plus: null | { plan: 'monthly' | 'yearly' | 'partner'; since: number };
  goals: Goal[];
  target: string | null;
  partner: string | null;
  voice: boolean;
  reducedMotion: boolean;

  completeOnboarding: (p: Profile, traits: Vec, worldAff: Partial<WVec>, unlocked: WorldId[]) => void;
  recordActivity: (a: Omit<Activity, 'id' | 'at' | 'enjoy'>) => { activityId: string; reward: Reward };
  rate: (activityId: string, enjoy: Enjoy) => { shifted: WorldId | null; dropped: WorldId | null };
  bump: (kind: QuestKind, amount?: number) => void;
  ensureDaily: () => void;
  claimQuest: (id: string) => void;
  claimWeekly: () => void;
  claimNode: (nodeId: string, sparks: number, keys: number) => void;
  unlockWorld: (w: WorldId) => boolean;
  toggleSave: (careerId: string) => void;
  view: (careerId: string) => void;
  setEpisode: (id: string, frac: number) => void;
  pushChat: (m: Omit<ChatMsg, 'id'>) => void;
  buyHat: (h: HatId, price: number) => boolean;
  setHat: (h: HatId) => void;
  dismissToast: (id: string) => void;
  toast: (text: string) => void;
  setPlus: (plan: 'monthly' | 'yearly' | 'partner' | null) => void;
  addGoal: (text: string, horizon: Goal['horizon']) => void;
  toggleGoal: (id: string) => void;
  removeGoal: (id: string) => void;
  setTarget: (id: string | null) => void;
  joinPartner: (code: string) => boolean;
  setVoice: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  resetAll: () => void;
}

const initial = () => ({
  onboarded: false,
  profile: null,
  traits: zeroT(),
  worldAff: {},
  baseline: null,
  xp: 0,
  sparks: 50,
  keys: 0,
  streak: { count: 0, best: 0, last: null },
  activities: [],
  skillPts: {},
  saved: [],
  viewed: [],
  unlockedWorlds: [],
  claimedNodes: [],
  episodeProg: {},
  chat: [],
  chatCount: 0,
  hats: ['explorer', 'none'] as HatId[],
  hat: 'explorer' as HatId,
  achievements: {},
  toasts: [],
  daily: { day: '', quests: [] },
  weekly: { week: '', worlds: [], claimed: false },
  plus: null,
  goals: [],
  target: null,
  partner: null,
  voice: true,
  reducedMotion: false,
});

export const useGame = create<State>()(
  persist(
    (set, get) => {
      const grant = (ids: string[]) => {
        const s = get();
        const fresh = ids.filter((id) => !s.achievements[id]);
        if (!fresh.length) return [];
        const ach = { ...s.achievements };
        const hats = [...s.hats];
        fresh.forEach((id) => {
          ach[id] = Date.now();
          const r = ACHIEVEMENTS.find((a) => a.id === id)?.reward;
          if (r && !hats.includes(r)) hats.push(r);
        });
        set({ achievements: ach, hats, toasts: [...s.toasts, ...fresh.map((a) => ({ id: uid(), achievement: a }))] });
        return fresh;
      };

      const checkAchievements = () => {
        const s = get();
        const worlds = new Set(s.activities.map((a) => a.world));
        const sims = s.activities.filter((a) => a.kind === 'sim');
        const simIds = new Set(sims.map((a) => a.ref));
        const ids: string[] = [];
        if (sims.length >= 1) ids.push('first-sim');
        if (sims.length >= 5) ids.push('five-sims');
        if (FEATURED_SIMS.every((x) => simIds.has(x))) ids.push('all-core');
        if (worlds.size >= 3) ids.push('three-worlds');
        if (worlds.size >= 6) ids.push('six-worlds');
        if (s.streak.count >= 3) ids.push('streak-3');
        if (s.streak.count >= 7) ids.push('streak-7');
        if (s.saved.length >= 3) ids.push('saver');
        if (s.chatCount >= 5) ids.push('chatty');
        if (levelFromXp(s.xp).level >= 5) ids.push('level-5');
        if (s.goals.length >= 1) ids.push('roadmap');
        if (s.activities.filter((a) => a.kind === 'lesson').length >= 5) ids.push('lessons-5');
        if (Object.values(s.episodeProg).some((v) => v >= 0.99)) ids.push('listener');
        if (s.activities.some((a) => a.enjoy === 1)) ids.push('honest');
        return grant(ids);
      };

      const touchStreak = () => {
        const s = get();
        const t = today();
        if (s.streak.last === t) return;
        const y = today(new Date(Date.now() - 86400000));
        const count = s.streak.last === y ? s.streak.count + 1 : 1;
        set({ streak: { count, best: Math.max(s.streak.best, count), last: t } });
      };

      return {
        ...initial(),

        completeOnboarding: (profile, traits, worldAff, unlocked) => {
          set({ onboarded: true, profile, traits, worldAff, baseline: { traits: { ...traits }, worldAff: { ...worldAff } }, unlockedWorlds: unlocked });
          get().ensureDaily();
          grant(['hello']);
        },

        recordActivity: (a) => {
          const before = levelFromXp(get().xp).level;
          const id = uid();
          const s = get();
          const isNewWorld = !s.activities.some((x) => x.world === a.world);
          const skillPts = { ...s.skillPts };
          a.skills.forEach((k) => (skillPts[k] = (skillPts[k] ?? 0) + 1));
          const sparks = Math.round(a.xp / 5);
          // performance nudges affinity a little; enjoyment (rate) matters far more
          const worldAff = { ...s.worldAff, [a.world]: (s.worldAff[a.world] ?? 0) + a.score * 0.3 };
          const wk = weekKey();
          const weekly = s.weekly.week === wk ? s.weekly : { week: wk, worlds: [], claimed: false };
          set({
            activities: [...s.activities, { ...a, id, at: Date.now(), enjoy: null }],
            xp: s.xp + a.xp, sparks: s.sparks + sparks, skillPts, worldAff,
            weekly: { ...weekly, worlds: weekly.worlds.includes(a.world) ? weekly.worlds : [...weekly.worlds, a.world] },
          });
          touchStreak();
          get().bump('xp', a.xp);
          get().bump(a.kind === 'sim' ? 'sim' : a.kind === 'lesson' ? 'lesson' : 'episode');
          if (isNewWorld) get().bump('world');
          const after = levelFromXp(get().xp).level;
          let keys = 0;
          if (after > before) { keys = after - before; set((st) => ({ keys: st.keys + keys })); }
          const achievements = checkAchievements();
          return { activityId: id, reward: { xp: a.xp, sparks, levelUp: after > before ? after : null, achievements, keys } };
        },

        rate: (activityId, enjoy) => {
          const s = get();
          const act = s.activities.find((x) => x.id === activityId);
          if (!act) return { shifted: null, dropped: null };
          const career = act.careerId ? CAREER_BY_ID[act.careerId] : undefined;
          const traits = { ...s.traits };
          const k = enjoy === 3 ? 0.8 : enjoy === 2 ? 0.25 : -0.45;
          if (career) for (const [t, v] of Object.entries(career.traits)) traits[t as Trait] = Math.max(-3, traits[t as Trait] + (v as number) * k);
          const w = act.world;
          const delta = enjoy === 3 ? 1.6 : enjoy === 2 ? 0.4 : -1.4;
          const worldAff = { ...s.worldAff, [w]: Math.max(-4, (s.worldAff[w] ?? 0) + delta) };
          set({ traits, worldAff, activities: s.activities.map((x) => (x.id === activityId ? { ...x, enjoy } : x)) });
          checkAchievements();
          return { shifted: enjoy === 3 ? w : null, dropped: enjoy === 1 ? w : null };
        },

        bump: (kind, amount = 1) => {
          get().ensureDaily();
          const s = get();
          set({
            daily: {
              ...s.daily,
              quests: s.daily.quests.map((q) => {
                const def = QUEST_POOL.find((d) => d.id === q.id);
                return def?.kind === kind ? { ...q, progress: Math.min(def.target, q.progress + amount) } : q;
              }),
            },
          });
        },

        ensureDaily: () => {
          const s = get();
          const d = today();
          if (s.daily.day !== d) set({ daily: { day: d, quests: dailyQuestIds(d).map((id) => ({ id, progress: 0, claimed: false })) } });
          const wk = weekKey();
          if (s.weekly.week !== wk) set({ weekly: { week: wk, worlds: [], claimed: false } });
        },

        claimQuest: (id) => {
          const s = get();
          const q = s.daily.quests.find((x) => x.id === id);
          const def = QUEST_POOL.find((d) => d.id === id);
          if (!q || !def || q.claimed || q.progress < def.target) return;
          set({ sparks: s.sparks + def.reward, xp: s.xp + 10, daily: { ...s.daily, quests: s.daily.quests.map((x) => (x.id === id ? { ...x, claimed: true } : x)) } });
          checkAchievements();
        },

        claimWeekly: () => {
          const s = get();
          if (s.weekly.claimed || s.weekly.worlds.length < 3) return;
          set({ weekly: { ...s.weekly, claimed: true }, sparks: s.sparks + 75, keys: s.keys + 1 });
        },

        claimNode: (nodeId, sparks, keys) => {
          const s = get();
          if (s.claimedNodes.includes(nodeId)) return;
          set({ claimedNodes: [...s.claimedNodes, nodeId], sparks: s.sparks + sparks, keys: s.keys + keys, xp: s.xp + 15 });
          checkAchievements();
        },

        unlockWorld: (w) => {
          const s = get();
          if (s.unlockedWorlds.includes(w)) return true;
          if (s.keys < 1) return false;
          set({ keys: s.keys - 1, unlockedWorlds: [...s.unlockedWorlds, w] });
          return true;
        },

        toggleSave: (id) => {
          const s = get();
          const has = s.saved.includes(id);
          const c = CAREER_BY_ID[id];
          set({ saved: has ? s.saved.filter((x) => x !== id) : [...s.saved, id] });
          if (!has) {
            get().bump('save');
            // saving is a soft signal of interest
            if (c) set((st) => ({ worldAff: { ...st.worldAff, [c.world]: (st.worldAff[c.world] ?? 0) + 0.5 } }));
          }
          checkAchievements();
        },

        view: (id) => {
          const s = get();
          if (s.viewed.includes(id)) return;
          set({ viewed: [...s.viewed, id] });
          get().bump('library');
        },

        setEpisode: (id, frac) => {
          const s = get();
          const prev = s.episodeProg[id] ?? 0;
          set({ episodeProg: { ...s.episodeProg, [id]: Math.max(prev, frac) } });
          if (frac >= 0.99 && prev < 0.99) checkAchievements();
        },

        pushChat: (m) => {
          const s = get();
          set({ chat: [...s.chat, { ...m, id: uid() }].slice(-80), chatCount: s.chatCount + (m.from === 'me' ? 1 : 0) });
          if (m.from === 'me') { get().bump('scout'); checkAchievements(); }
        },

        buyHat: (h, price) => {
          const s = get();
          if (s.hats.includes(h)) return true;
          if (s.sparks < price) return false;
          set({ sparks: s.sparks - price, hats: [...s.hats, h], hat: h });
          return true;
        },
        setHat: (hat) => set({ hat }),
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        toast: (text) => set((s) => ({ toasts: [...s.toasts, { id: uid(), text }] })),
        setPlus: (plan) => set({ plus: plan ? { plan, since: Date.now() } : null }),
        addGoal: (text, horizon) => { set((s) => ({ goals: [...s.goals, { id: uid(), text, horizon, done: false, at: Date.now() }] })); checkAchievements(); },
        toggleGoal: (id) => set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)) })),
        removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
        setTarget: (target) => set({ target }),
        joinPartner: (code) => {
          const p = DEMO_PARTNERS.find((x) => x.code === code.trim().toUpperCase());
          if (!p) return false;
          set({ partner: p.code, ...(p.grantsPlus && !get().plus ? { plus: { plan: 'partner' as const, since: Date.now() } } : {}) });
          return true;
        },
        setVoice: (voice) => set({ voice }),
        setReducedMotion: (reducedMotion) => set({ reducedMotion }),
        resetAll: () => set({ ...initial() }),
      };
    },
    {
      name: 'direction-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ ...s, toasts: [] }),
      version: 1,
    },
  ),
);

export const useLevel = () => levelFromXp(useGame((s) => s.xp));
