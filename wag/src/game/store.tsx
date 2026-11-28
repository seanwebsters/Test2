import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AREAS, COMMUNITY, CREATURES, HATS, ITEM_BY_ID, PROJECTS, QUESTS, ageGroup, levelFromXp, makeFriends } from './data';
import { ALL_LESSONS } from './academy';
import { writeDiary } from './diary';
import type {
  Activity,
  AdventureRecord,
  BoosterId,
  Dog,
  Friend,
  GameState,
  GardenKind,
  HatId,
  Profile,
  QuestCategory,
  QuestDef,
  Reward,
  SeedPlot,
} from './types';
import { dayKey, daysBetween, hash, rng, shuffle, uid, weekKey } from './util';

const KEY = 'wag:v1';
export const GROW_MS = 90_000; // prototype speed: 90s per growth stage

export const blankState = (): GameState => ({
  version: 1,
  profile: null,
  coins: 0,
  seeds: 0,
  xp: 0,
  streak: { count: 0, lastDay: null, best: 0 },
  questsDay: '',
  quests: [],
  restDays: [],
  inventory: {},
  placed: [],
  ownedHats: ['none', 'flowercrown'],
  creatures: [],
  activities: [],
  diary: [],
  garden: [],
  plots: [],
  lessons: {},
  tricks: [],
  adventures: [],
  friends: [],
  sharedProgress: {},
  community: { week: weekKey(), contributed: 0, claimed: [] },
  plus: null,
  lastMailDay: null,
  timeMode: 'auto',
  seenIntro: false,
  sound: true,
  puzzle: { best: {}, stars: 0, starsEarned: 0, maps: 0, mapsDone: 0, bonusMoves: 0, boosters: { zoomies: 1, bone: 1, sniffer: 0 } },
  restored: [],
});

function load(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.version !== 1) return blankState();
    return { ...blankState(), ...parsed };
  } catch {
    return blankState();
  }
}

function save(s: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    // Storage full (usually photos). Retry without the oldest photos.
    try {
      const slim = {
        ...s,
        activities: s.activities.map((a, i) => (i < s.activities.length - 6 ? { ...a, photo: undefined } : a)),
      };
      localStorage.setItem(KEY, JSON.stringify(slim));
    } catch {
      /* give up silently */
    }
    return false;
  }
}

export function questsFor(dog: Dog, day: string, first: boolean): string[] {
  const group = ageGroup(dog.ageYears);
  const pool = QUESTS.filter((q) => q.id !== 'welcome' && q.energy.includes(dog.energy) && q.ages.includes(group));
  const r = rng(`${day}:${dog.name}`);
  const favs = shuffle(r, pool.filter((q) => q.favourite && dog.favourites.includes(q.favourite)));
  const rest = shuffle(r, pool.filter((q) => !favs.includes(q)));
  const chosen: QuestDef[] = [];
  const cats = new Set<QuestCategory>();
  for (const q of [...favs.slice(0, 1), ...rest, ...favs.slice(1)]) {
    if (chosen.length >= 3) break;
    if (cats.has(q.category)) continue;
    cats.add(q.category);
    chosen.push(q);
  }
  const ids = chosen.map((q) => q.id);
  if (first) return ['welcome', 'beautiful', ...ids.filter((i) => i !== 'beautiful').slice(0, 2)];
  return ids;
}

const CREATURE_FOR: Record<QuestCategory, string[]> = {
  calm: ['cloudpup', 'glowmoth'],
  explore: ['mossbun', 'pebbleturtle'],
  senses: ['puffcap', 'mossbun'],
  play: ['sunbeetle', 'dewdrop'],
  bond: ['pebbleturtle', 'cloudpup'],
  train: ['starfox', 'sunbeetle'],
};

function addMemory(s: GameState, kind: GardenKind, title: string, text: string, photo?: string): GameState {
  return {
    ...s,
    garden: [...s.garden, { id: uid(), ts: Date.now(), kind, title, text, photo, hue: hash(title) % 360 }],
  };
}

function bumpStreak(s: GameState, day: string): GameState {
  const st = { ...s.streak };
  if (st.lastDay === day) return s;
  if (st.lastDay && daysBetween(st.lastDay, day) <= 3) st.count += 1; // gaps are treated as rest, never punished
  else st.count = 1;
  st.lastDay = day;
  st.best = Math.max(st.best, st.count);
  let n: GameState = { ...s, streak: st };
  if (st.count === 7 && !s.garden.some((g) => g.title === 'A week together')) {
    n = addMemory(n, 'tree', 'A week together', 'Seven days of adventures, big and small. A Rhythm Tree took root.');
  }
  return n;
}

function boostPlots(s: GameState): GameState {
  return { ...s, plots: s.plots.map((p) => ({ ...p, boost: p.boost + 1 })) };
}

/** Apply a reward, handling level-ups. Returns new state and the reward queue to show. */
function grant(s: GameState, r: Reward): [GameState, Reward[]] {
  const before = levelFromXp(s.xp).level;
  const inv = { ...s.inventory };
  for (const it of r.items ?? []) inv[it] = (inv[it] ?? 0) + 1;
  let n: GameState = {
    ...s,
    coins: s.coins + (r.coins ?? 0),
    seeds: s.seeds + (r.seeds ?? 0),
    xp: s.xp + (r.xp ?? 0),
    inventory: inv,
    creatures: r.creature && !s.creatures.includes(r.creature) ? [...s.creatures, r.creature] : s.creatures,
    puzzle: {
      ...s.puzzle,
      maps: s.puzzle.maps + (r.maps ?? 0),
      bonusMoves: Math.min(9, s.puzzle.bonusMoves + (r.moves ?? 0)),
      boosters: r.booster ? { ...s.puzzle.boosters, [r.booster]: s.puzzle.boosters[r.booster] + 1 } : s.puzzle.boosters,
    },
  };
  const queue: Reward[] = [r];
  const after = levelFromXp(n.xp).level;
  for (let l = before + 1; l <= after; l++) {
    n = addMemory(n, 'lantern', `Friendship level ${l}`, 'Our bond grew a little stronger.');
    n = { ...n, coins: n.coins + 50, seeds: n.seeds + 1 };
    queue.push({ kind: 'level', title: `Friendship level ${l}!`, subtitle: 'Your bond grows stronger — new shop items unlocked', coins: 50, seeds: 1 });
  }
  return [n, queue];
}

function logActivity(s: GameState, a: Omit<Activity, 'id' | 'ts'> & { ts?: number }): GameState {
  const act: Activity = { id: uid(), ts: a.ts ?? Date.now(), ...a };
  let n = { ...s, activities: [...s.activities, act] };
  n = bumpStreak(n, dayKey(act.ts));
  n = boostPlots(n);
  if (a.photo) n = addMemory(n, 'photo', a.title, a.note || 'A moment worth keeping.', a.photo);
  return n;
}

function sampleHistory(p: Profile): { activities: Activity[]; diary: GameState['diary'] } {
  const now = Date.now();
  const at = (daysAgo: number, h: number) => {
    const d = new Date(now - daysAgo * 86400000);
    d.setHours(h, 15, 0, 0);
    return d.getTime();
  };
  const activities: Activity[] = [
    { id: uid(), ts: at(3, 10), type: 'walk', title: 'Morning ramble', minutes: 34, distanceKm: 2.4, discoveries: ['A Particularly Excellent Stick', 'A Crunchy Golden Leaf'], sample: true },
    { id: uid(), ts: at(3, 16), type: 'quest', title: 'Find three interesting smells', category: 'senses', sample: true },
    { id: uid(), ts: at(2, 11), type: 'rest', title: 'Rest day', sample: true },
    { id: uid(), ts: at(2, 20), type: 'cuddle', title: 'Sofa evening', sample: true },
    { id: uid(), ts: at(1, 14), type: 'quest', title: `Play ${p.dog.name}’s favourite game`, category: 'play', sample: true },
    { id: uid(), ts: at(1, 18), type: 'quest', title: 'Watch the sunset together', category: 'calm', sample: true },
  ];
  const diary = [3, 2, 1].map((d) => {
    const day = dayKey(now - d * 86400000);
    return writeDiary({ day, dog: p.dog, owner: p.ownerName, activities: activities.filter((a) => dayKey(a.ts) === day), sample: true });
  });
  return { activities, diary };
}

export function newGame(p: Profile): GameState {
  const today = dayKey();
  const hist = sampleHistory(p);
  let s: GameState = {
    ...blankState(),
    profile: p,
    coins: 120,
    seeds: 3,
    xp: 0,
    questsDay: today,
    quests: questsFor(p.dog, today, true).map((defId) => ({ defId, done: false })),
    inventory: { flowerpot: 1, ball: 1 },
    placed: [
      { uid: uid(), itemId: 'flowerpot', x: 322, y: 300 },
      { uid: uid(), itemId: 'lantern', x: 452, y: 268 },
    ],
    activities: hist.activities,
    diary: hist.diary,
    friends: makeFriends(Date.now()).slice(0, 3),
    plots: [{ plot: 0, plantedAt: Date.now() - GROW_MS * 2, boost: 0, species: 'moonbloom' }],
    lastMailDay: null,
  };
  s = addMemory(s, 'tree', 'The day we began', `${p.ownerName} and ${p.dog.name} discovered ${p.islandName}. A Wishing Tree sapling was planted.`, p.dog.photo);
  if (p.dog.adoptionDate) s = addMemory(s, 'flower', 'Gotcha day', `${p.dog.name} came home on ${new Date(p.dog.adoptionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. The best day.`);
  return s;
}

interface Ctx {
  s: GameState;
  set: (fn: (s: GameState) => GameState) => void;
  rewards: Reward[];
  dismissReward: () => void;
  toast: string | null;
  say: (msg: string) => void;
  actions: ReturnType<typeof makeActions>;
}

const GameCtx = createContext<Ctx | null>(null);

function makeActions(set: (fn: (s: GameState) => GameState) => void, queue: (r: Reward[]) => void, say: (m: string) => void) {
  const withGrant = (fn: (s: GameState) => [GameState, Reward]) =>
    set((s) => {
      const [n, r] = fn(s);
      if (n === s && r.title === 'Not yet') return s;
      const [g, q] = grant(n, r);
      queue(q);
      return g;
    });

  return {
    start(p: Profile) {
      set(() => newGame(p));
    },
    reset() {
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* noop */
      }
      set(() => blankState());
    },
    updateDog(patch: Partial<Dog>) {
      set((s) => (s.profile ? { ...s, profile: { ...s.profile, dog: { ...s.profile.dog, ...patch } } } : s));
    },
    updateProfile(patch: Partial<Profile>) {
      set((s) => (s.profile ? { ...s, profile: { ...s.profile, ...patch } } : s));
    },
    ensureDay() {
      set((s) => {
        if (!s.profile) return s;
        const today = dayKey();
        let n = s;
        if (s.questsDay !== today) {
          n = { ...n, questsDay: today, quests: questsFor(s.profile.dog, today, false).map((defId) => ({ defId, done: false })) };
        }
        const wk = weekKey();
        if (n.community.week !== wk) n = { ...n, community: { week: wk, contributed: 0, claimed: [] } };
        return n;
      });
    },
    completeQuest(def: QuestDef, extra: { note?: string; photo?: string; mood?: string }) {
      withGrant((s) => {
        const dogName = s.profile?.dog.name ?? 'your dog';
        let n: GameState = { ...s, quests: s.quests.map((q) => (q.defId === def.id ? { ...q, done: true, completedAt: Date.now() } : q)) };
        n = logActivity(n, { type: 'quest', title: def.title.replaceAll('{dog}', dogName), category: def.category, minutes: def.minutes, ...extra });
        if (def.category === 'senses') n = { ...n, community: { ...n.community, contributed: n.community.contributed + 3 } };
        if (def.category === 'calm') n = { ...n, sharedProgress: { ...n.sharedProgress, 'luna-sunset': (n.sharedProgress['luna-sunset'] ?? 0) + 1 } };
        const r = rng(def.id + Date.now());
        const first = !s.activities.some((a) => a.type === 'quest' && !a.sample);
        let creature: string | undefined;
        const cands = CREATURE_FOR[def.category].filter((c) => !n.creatures.includes(c));
        if (def.id === 'welcome') creature = 'cloudpup';
        else if (cands.length && r() < 0.45) creature = cands[0];
        const items: string[] = [];
        if (def.id === 'welcome') items.push('lantern');
        else if (r() < 0.35) items.push(['flowerpot', 'ball', 'lantern', 'mushroom'][Math.floor(r() * 4)]);
        if (first) n = addMemory(n, 'flower', 'Our first quest', `${def.title.replaceAll('{dog}', dogName)} — the very first of many.`);
        return [
          n,
          {
            kind: 'quest',
            title: 'Quest complete!',
            subtitle: def.title.replaceAll('{dog}', dogName),
            coins: 20 + Math.round(def.minutes * 1.2),
            xp: Math.min(90, 40 + def.minutes * 2),
            seeds: def.minutes >= 10 || def.id === 'welcome' ? 1 : 0,
            items,
            creature,
            // real-world → Treasure Trails
            maps: def.category === 'explore' ? 1 : 0,
            moves: def.category === 'play' ? 3 : def.category === 'calm' || def.category === 'bond' ? 2 : 0,
            booster: def.category === 'train' ? 'zoomies' : def.category === 'senses' ? 'sniffer' : undefined,
          },
        ];
      });
    },
    logRest() {
      set((s) => {
        const today = dayKey();
        if (s.restDays.includes(today)) return s;
        let n = logActivity({ ...s, restDays: [...s.restDays, today] }, { type: 'rest', title: 'Rest day' });
        const [g, q] = grant(n, { kind: 'quest', title: 'Rest day logged', subtitle: 'Rest is part of a happy life. Your streak is safe.', xp: 20, coins: 10, moves: 2 });
        n = g;
        queue(q);
        return n;
      });
    },
    finishAdventure(rec: AdventureRecord, photo?: string) {
      withGrant((s) => {
        const firstWalk = !s.adventures.length;
        let n: GameState = { ...s, adventures: [...s.adventures, rec] };
        n = logActivity(n, { type: 'walk', title: rec.minutes >= 25 ? 'A long adventure' : 'A little adventure', minutes: rec.minutes, distanceKm: rec.distanceKm, discoveries: rec.discoveries, photo });
        n = {
          ...n,
          sharedProgress: { ...n.sharedProgress, 'biscuit-walk': (n.sharedProgress['biscuit-walk'] ?? 0) + rec.minutes },
          community: { ...n.community, contributed: n.community.contributed + rec.challenges.filter((c) => c === 'sniff3').length * 3 + rec.discoveries.length },
        };
        if (firstWalk) n = addMemory(n, 'flower', 'Our first WAG adventure', `${rec.minutes} minutes, ${rec.discoveries.length} discoveries. ${rec.discoveries[0] ?? ''}`.trim());
        if (rec.discoveries.some((d) => /Clover/.test(d))) n = addMemory(n, 'mushroom', 'A lucky find', 'A four-leaf clover, found together on a walk.');
        const cands = ['mossbun', 'pebbleturtle', 'glowmoth', 'starfox', 'dewdrop'].filter((c) => !n.creatures.includes(c));
        const creature = rec.discoveries.length >= 2 && cands.length ? cands[0] : undefined;
        return [n, { kind: 'walk', title: 'Adventure complete!', subtitle: `${rec.minutes} min together`, coins: rec.coins, xp: rec.xp, seeds: rec.discoveries.length >= 3 ? 2 : 1, creature, maps: 1 + (rec.discoveries.length >= 3 ? 1 : 0) }];
      });
    },
    completeLesson(lessonId: string, stars: number) {
      withGrant((s) => {
        const l = ALL_LESSONS.find((x) => x.id === lessonId)!;
        const firstTime = !(lessonId in s.lessons);
        let n: GameState = { ...s, lessons: { ...s.lessons, [lessonId]: Math.max(stars, s.lessons[lessonId] ?? 0) } };
        n = logActivity(n, { type: 'lesson', title: l.title, category: 'train' });
        if (l.trick && !n.tricks.includes(l.trick.id)) {
          n = { ...n, tricks: [...n.tricks, l.trick.id] };
          n = addMemory(n, 'crystal', `Learned “${l.trick.name}”`, `${s.profile?.dog.name} can now do ${l.trick.name.toLowerCase()} on the island too.`);
        }
        return [
          n,
          {
            kind: 'lesson',
            title: firstTime ? 'Lesson complete!' : 'Lesson practised!',
            subtitle: l.trick ? `New island trick: ${l.trick.name}` : l.title,
            coins: firstTime ? 30 : 10,
            xp: firstTime ? 50 : 15,
            booster: l.trick && firstTime ? TRICK_BOOSTER[l.trick.id] ?? 'zoomies' : undefined,
          },
        ];
      });
    },
    buyItem(id: string) {
      set((s) => {
        const it = ITEM_BY_ID[id];
        if (!it || s.coins < it.price) return s;
        say(`${it.name} added to your bag`);
        return { ...s, coins: s.coins - it.price, inventory: { ...s.inventory, [id]: (s.inventory[id] ?? 0) + 1 } };
      });
    },
    place(itemId: string, x: number, y: number) {
      set((s) => {
        if (!s.inventory[itemId]) return s;
        const inv = { ...s.inventory, [itemId]: s.inventory[itemId] - 1 };
        if (!inv[itemId]) delete inv[itemId];
        return { ...s, inventory: inv, placed: [...s.placed, { uid: uid(), itemId, x, y }] };
      });
    },
    move(uidv: string, x: number, y: number) {
      set((s) => ({ ...s, placed: s.placed.map((p) => (p.uid === uidv ? { ...p, x, y } : p)) }));
    },
    pickUp(uidv: string) {
      set((s) => {
        const p = s.placed.find((x) => x.uid === uidv);
        if (!p) return s;
        return { ...s, placed: s.placed.filter((x) => x.uid !== uidv), inventory: { ...s.inventory, [p.itemId]: (s.inventory[p.itemId] ?? 0) + 1 } };
      });
    },
    buyHat(id: HatId) {
      set((s) => {
        const h = HATS.find((x) => x.id === id)!;
        if (s.ownedHats.includes(id) || s.coins < h.price) return s;
        return { ...s, coins: s.coins - h.price, ownedHats: [...s.ownedHats, id] };
      });
    },
    plant(plot: number, species: SeedPlot['species']) {
      set((s) => {
        if (s.seeds < 1 || s.plots.some((p) => p.plot === plot)) return s;
        return { ...s, seeds: s.seeds - 1, plots: [...s.plots, { plot, plantedAt: Date.now(), boost: 0, species }] };
      });
    },
    harvest(plot: number) {
      withGrant((s) => {
        const p = s.plots.find((x) => x.plot === plot)!;
        const cands = ['dewdrop', 'sunbeetle', 'glowmoth'].filter((c) => !s.creatures.includes(c));
        const creature = cands.length && Math.random() < 0.5 ? cands[0] : undefined;
        const n = { ...s, plots: s.plots.filter((x) => x.plot !== plot) };
        const name = p.species === 'moonbloom' ? 'Moonbloom' : p.species === 'sunpetal' ? 'Sunpetal' : 'Starbell';
        return [n, { kind: 'harvest', title: `${name} harvested`, subtitle: 'Grown with love (and walks)', coins: 35, xp: 15, creature, seeds: Math.random() < 0.5 ? 1 : 0 }];
      });
    },
    writeTonight(variant = 0) {
      set((s) => {
        if (!s.profile) return s;
        const today = dayKey();
        const acts = s.activities.filter((a) => dayKey(a.ts) === today);
        const entry = writeDiary({ day: today, dog: s.profile.dog, owner: s.profile.ownerName, activities: acts, variant });
        const existing = s.diary.find((d) => d.day === today);
        if (existing) entry.saved = existing.saved;
        return { ...s, diary: [...s.diary.filter((d) => d.day !== today), entry] };
      });
    },
    toggleSaved(id: string) {
      set((s) => ({ ...s, diary: s.diary.map((d) => (d.id === id ? { ...d, saved: !d.saved } : d)) }));
    },
    sendGift(friendId: string, giftId: string) {
      set((s) => {
        const today = dayKey();
        const f = s.friends.find((x) => x.id === friendId);
        if (!f) return s;
        let n = s;
        if (giftId === 'treats') {
          if (s.coins < 25) return s;
          n = { ...n, coins: n.coins - 25 };
        }
        if (giftId === 'flower') {
          if (s.seeds < 1) return s;
          n = { ...n, seeds: n.seeds - 1 };
        }
        if (giftId === 'wave' && f.giftedToday === today) return s;
        say(`Gift sent to ${f.dog.name}! ${f.ownerName} will see it on ${f.islandName}.`);
        return { ...n, xp: n.xp + 5, friends: n.friends.map((x) => (x.id === friendId ? { ...x, giftedToday: today } : x)) };
      });
    },
    addFriend(code: string) {
      set((s) => {
        const all = makeFriends(Date.now());
        const next = all.find((f) => !s.friends.some((x) => x.id === f.id));
        let friend: Friend | undefined = next;
        if (!friend) {
          const r = rng(code);
          const names = ['Waffle', 'Juniper', 'Pickle', 'Hazel', 'Otis', 'Clementine', 'Rolo'];
          const nm = names[Math.floor(r() * names.length)];
          friend = { ...all[Math.floor(r() * all.length)], id: uid(), ownerName: code.slice(0, 12) || 'New friend', islandName: `${nm}’s Hollow` };
          friend = { ...friend, dog: { ...friend.dog, name: nm } };
        }
        say(`${friend.dog.name} is now your neighbour!`);
        return { ...s, friends: [...s.friends, { ...friend, addedAt: Date.now() }] };
      });
    },
    collectMail() {
      withGrant((s) => {
        const f = s.friends[Math.floor(Math.random() * Math.max(1, s.friends.length))];
        const n = { ...s, lastMailDay: dayKey() };
        const nn = logActivity(n, { type: 'gift', title: 'a basket of treats', detail: f?.dog.name });
        return [nn, { kind: 'gift', title: `A gift from ${f?.dog.name ?? 'a friend'}!`, subtitle: `Sent from ${f?.islandName ?? 'a nearby island'}`, coins: 25, items: Math.random() < 0.5 ? ['flowerpot'] : [] }];
      });
    },
    claimCommunity(tier: number) {
      withGrant((s) => {
        const t = COMMUNITY.tiers[tier];
        let n: GameState = { ...s, community: { ...s.community, claimed: [...s.community.claimed, tier] } };
        if (t.hat && !n.ownedHats.includes(t.hat)) n = { ...n, ownedHats: [...n.ownedHats, t.hat] };
        return [n, { kind: 'unlock', title: 'Community reward!', subtitle: t.reward, coins: t.coins, items: t.item ? [t.item] : [] }];
      });
    },
    setPlus(plan: 'monthly' | 'yearly' | null) {
      set((s) => ({ ...s, plus: plan ? { plan, since: Date.now() } : null }));
    },
    setTimeMode(m: GameState['timeMode']) {
      set((s) => ({ ...s, timeMode: m }));
    },
    markIntro() {
      set((s) => ({ ...s, seenIntro: true }));
    },
    cuddle() {
      set((s) => {
        const today = dayKey();
        if (s.activities.some((a) => a.type === 'cuddle' && dayKey(a.ts) === today)) return s;
        return { ...s, activities: [...s.activities, { id: uid(), ts: Date.now(), type: 'cuddle', title: 'Island cuddles' }] };
      });
    },
    finishPuzzle(levelId: string, stars: number, map: boolean, treasure?: string) {
      withGrant((s) => {
        const prev = s.puzzle.best[levelId] ?? 0;
        const gained = map ? stars : Math.max(0, stars - prev);
        const firstClear = !prev;
        let n: GameState = {
          ...s,
          puzzle: {
            ...s.puzzle,
            best: map ? s.puzzle.best : { ...s.puzzle.best, [levelId]: Math.max(prev, stars) },
            stars: s.puzzle.stars + gained,
            starsEarned: s.puzzle.starsEarned + gained,
            mapsDone: s.puzzle.mapsDone + (map ? 1 : 0),
          },
        };
        if (levelId === 'L6' && firstClear) n = addMemory(n, 'mushroom', 'Meadows complete', 'We finished the Enchanted Meadows trail together.');
        return [
          n,
          {
            kind: 'puzzle',
            title: map ? 'Treasure found!' : stars === 3 ? 'Paw-fect!' : 'Level complete!',
            subtitle: gained ? `+${gained} star${gained > 1 ? 's' : ''} to build your island` : 'Best score kept — practise makes paw-fect',
            stars: gained,
            coins: (map ? 60 : firstClear ? 20 : 8) + stars * 5,
            xp: firstClear || map ? 15 : 0,
            items: treasure ? [treasure] : [],
          },
        ];
      });
    },
    startPuzzle(map: boolean, useBonus: boolean) {
      set((s) => ({
        ...s,
        puzzle: { ...s.puzzle, maps: map ? Math.max(0, s.puzzle.maps - 1) : s.puzzle.maps, bonusMoves: useBonus ? 0 : s.puzzle.bonusMoves },
      }));
    },
    useBooster(id: BoosterId) {
      set((s) => ({ ...s, puzzle: { ...s.puzzle, boosters: { ...s.puzzle.boosters, [id]: Math.max(0, s.puzzle.boosters[id] - 1) } } }));
    },
    buyBooster(id: BoosterId) {
      set((s) => (s.coins < 60 ? s : { ...s, coins: s.coins - 60, puzzle: { ...s.puzzle, boosters: { ...s.puzzle.boosters, [id]: s.puzzle.boosters[id] + 1 } } }));
    },
    build(projectId: string) {
      withGrant((s) => {
        const p = PROJECTS.find((x) => x.id === projectId)!;
        if (s.restored.includes(p.id) || s.puzzle.stars < p.stars) return [s, { kind: 'unlock', title: 'Not yet', subtitle: '' }];
        const dog = s.profile?.dog.name ?? 'your dog';
        let n: GameState = { ...s, restored: [...s.restored, p.id], puzzle: { ...s.puzzle, stars: s.puzzle.stars - p.stars } };
        n = addMemory(n, p.area ? 'tree' : 'flower', p.name.replaceAll('{dog}', dog), p.story.replaceAll('{dog}', dog));
        return [n, { kind: 'unlock', title: p.area ? 'New territory!' : 'Island restored!', subtitle: p.name.replaceAll('{dog}', dog), items: p.reward ? [p.reward] : [], xp: 30 }];
      });
    },
    spend(n: number) {
      set((s) => (s.coins < n ? s : { ...s, coins: s.coins - n }));
    },
    grantDebug(r: Reward) {
      withGrant((s) => [s, r]);
    },
  };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<GameState>(load);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const say = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const set = useCallback((fn: (s: GameState) => GameState) => setS(fn), []);
  const queue = useCallback((r: Reward[]) => setRewards((q) => [...q, ...r]), []);
  const actions = useMemo(() => makeActions(set, queue, say), [set, queue, say]);

  useEffect(() => {
    save(s);
  }, [s]);

  const value = useMemo<Ctx>(
    () => ({ s, set, rewards, dismissReward: () => setRewards((q) => q.slice(1)), toast, say, actions }),
    [s, set, rewards, toast, say, actions],
  );
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const c = useContext(GameCtx);
  if (!c) throw new Error('useGame outside provider');
  return c;
}

export const useDog = () => useGame().s.profile!.dog;

export function areaUnlocked(s: GameState, id: string) {
  const a = AREAS.find((x) => x.id === id)!;
  if (a.plus) return !!s.plus;
  if (id === 'meadow') return true;
  return s.restored.includes(id);
}

const TRICK_BOOSTER: Record<string, BoosterId> = { spin: 'zoomies', bow: 'bone', sniff: 'sniffer', wave: 'bone', boop: 'zoomies', perk: 'sniffer', roll: 'bone' };

export function plotStage(p: SeedPlot, now = Date.now()) {
  return Math.min(3, Math.floor((now - p.plantedAt) / GROW_MS) + p.boost);
}

export const CREATURE_COUNT = CREATURES.length;
