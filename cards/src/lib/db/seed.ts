import { catalog, liveUniverses, releasedEpisodes } from "@/lib/catalog";
import { DAY_MS } from "@/lib/clock";
import type { GenreId } from "@/lib/content/types";
import { defaultEconomyConfig } from "@/lib/economy/config";
import { seededRng } from "@/lib/economy/rng";
import { iso, wallet } from "@/lib/services/core";
import { openPackTx } from "@/lib/services/packs";
import { completeEpisodeTx, episodeAccess } from "@/lib/services/story";
import { hashPassword, makeUser } from "@/lib/services/users";
import type { DbState } from "./types";

export const ADMIN_USER_ID = "usr_studio_admin";

export function emptyState(at: number): DbState {
  return {
    version: 1,
    seededAt: iso(at),
    users: {},
    wallets: {},
    inventory: {},
    openings: [],
    dailyClaims: [],
    follows: [],
    userFollows: [],
    favourites: [],
    storyProgress: [],
    notifications: [],
    achievements: [],
    events: [],
    transactions: [],
    searches: [],
    universes: [],
    overrides: {},
    jobs: [],
    economy: { ...defaultEconomyConfig(), updatedAt: iso(at) },
    opportunityWeights: { growth: 25, retention: 20, depth: 20, story: 15, follows: 10, sharing: 10 },
    audit: [],
  };
}

const DEMO_COLLECTORS: { username: string; displayName: string; bio: string; genres: GenreId[]; favourites: string[] }[] = [
  { username: "lanternlily", displayName: "Lily Okoro", bio: "Moon Market completionist. Will trade noodles for Suzu holos.", genres: ["cosy", "fantasy", "anime"], favourites: ["moon-market", "the-greenhouse", "tiny-titans"] },
  { username: "staticjuno", displayName: "Marcus Lind", bio: "Neon Runners day one. Halflife forever.", genres: ["sci-fi", "adventure", "anime"], favourites: ["neon-runners", "zero-gravity-club"] },
  { username: "room404", displayName: "Priya Sethi", bio: "I solve fictional murders for fun. Currently: who is the other Cassius?", genres: ["mystery", "surreal", "drama"], favourites: ["the-last-hotel", "ghost-signal", "afterlight"] },
  { username: "deepdiver", displayName: "Tomás Ferreira", bio: "Real marine biologist. Deep Blue is scarily accurate.", genres: ["creatures", "adventure"], favourites: ["deep-blue", "tiny-titans"] },
  { username: "frequency879", displayName: "Hana Kim", bio: "Transcribing every Ghost Signal broadcast. DM me your theories.", genres: ["horror", "mystery", "sci-fi"], favourites: ["ghost-signal", "the-last-hotel"] },
  { username: "oxbloodqueen", displayName: "Amara Venn-Smith", bio: "Crownless costume nerd. Team Isadora.", genres: ["drama", "romance", "fantasy"], favourites: ["crownless", "heartbreak-highway"] },
  { username: "staplerfan", displayName: "Joe Brennan", bio: "Duncan deserved better. Oddly Alive sticker collector.", genres: ["comedy", "cosy", "surreal"], favourites: ["oddly-alive", "tiny-titans"] },
  { username: "dusklight", displayName: "Sofia Marrow", bio: "No relation to Ila (probably). Afterlight Mythic hunter.", genres: ["surreal", "romance", "fantasy"], favourites: ["afterlight", "heartbreak-highway", "moon-market"] },
];

/**
 * Builds a fresh platform state. Demo collectors get a believable activity
 * history generated through the real services, so charts and "rare pulls"
 * have data from day one. All demo users are flagged `isDemo`.
 */
export function buildSeedState(at: number, adminPassword: string): DbState {
  const state = emptyState(at);
  const admin = makeUser(ADMIN_USER_ID, at, {
    username: "studio",
    displayName: "NEXARA Studio",
    bio: "Editorial and production team.",
    role: "admin",
    isGuest: false,
    passwordHash: hashPassword(adminPassword),
    onboardedAt: iso(at),
    starterClaimed: true,
  });
  state.users[admin.id] = admin;
  wallet(state, admin.id);

  const rng = seededRng(20261017);
  DEMO_COLLECTORS.forEach((d, n) => {
    const id = `usr_demo_${d.username}`;
    const joined = at - (20 + n * 3) * DAY_MS;
    state.users[id] = makeUser(id, joined, { ...d, isGuest: false, isDemo: true, onboardedAt: iso(joined), avatarSeed: (n * 47) % 360, starterClaimed: false });
    wallet(state, id).shards = 0;
    d.favourites.forEach((u, i) => state.follows.push({ userId: id, universeId: u, at: iso(joined + i * 3600_000) }));

    let k = 0;
    const days = 20 + n * 3;
    for (let day = days; day >= 0; day--) {
      if (day % (2 + (n % 3)) === 1) continue; // demo collectors skip some days
      const t = at - day * DAY_MS - (n + 1) * 1800_000;
      const live = liveUniverses(state, t).map((u) => u.id);
      const prefs = d.favourites.filter((u) => live.includes(u));
      const uni = prefs.length ? prefs[(day + n) % prefs.length]! : live[(day + n) % live.length]!;
      const type = k === 0 ? "starter" : "daily";
      openPackTx(state, id, { packType: type, universeId: uni, idempotencyKey: `seed-${id}-${k++}` }, rng, t);
      // Read episodes they have access to, now and then.
      if (day % 3 === 0) {
        const idx = catalog(state);
        const u = idx.byId.get(uni)!;
        for (const ep of releasedEpisodes(idx, u, t)) {
          const p = state.storyProgress.find((x) => x.userId === id && x.episodeId === ep.id);
          if (p?.completedAt) continue;
          if (episodeAccess(state, id, ep, t).unlocked) {
            completeEpisodeTx(state, id, ep.id, t + 600_000);
            openPackTx(state, id, { packType: "episode", universeId: uni, episodeId: ep.id, idempotencyKey: `seed-${id}-${k++}` }, rng, t + 700_000);
          }
          break;
        }
      }
    }
    const inv = state.inventory[id] ?? {};
    const best = Object.keys(inv)
      .map((cid) => catalog(state).cards.get(cid)!)
      .sort((a, b) => ["common", "uncommon", "rare", "epic", "legendary", "mythic"].indexOf(b.rarity) - ["common", "uncommon", "rare", "epic", "legendary", "mythic"].indexOf(a.rarity))
      .slice(0, 6);
    state.users[id]!.showcase = best.map((c) => c.id);
    best.slice(0, 3).forEach((c) => state.favourites.push({ userId: id, cardId: c.id, at: iso(at - DAY_MS) }));
  });
  // Collectors following each other.
  const ids = DEMO_COLLECTORS.map((d) => `usr_demo_${d.username}`);
  ids.forEach((a, i) => [1, 3].forEach((s) => state.userFollows.push({ followerId: a, followeeId: ids[(i + s) % ids.length]!, at: iso(at - 5 * DAY_MS) })));
  // Demo notifications belong to demo users only and aren't useful; drop them.
  state.notifications = [];
  return state;
}
