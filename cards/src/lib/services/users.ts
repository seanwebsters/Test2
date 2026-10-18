import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { catalog } from "@/lib/catalog";
import { DAY_MS } from "@/lib/clock";
import { GENRES, type GenreId } from "@/lib/content/types";
import type { DbState, User, UserSettings } from "@/lib/db/types";
import { evaluateAchievements } from "./achievements";
import { audit, iso, notify, requireUser, ServiceError, track, wallet } from "./core";

export const defaultSettings = (): UserSettings => ({
  sound: true,
  haptics: true,
  reducedMotion: false,
  notifications: { dailyReady: true, newEpisodes: true, newCards: true, completions: true, seasonLaunches: true, events: true, email: false, push: false },
});

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function verifyPassword(password: string, stored?: string) {
  if (!stored) return false;
  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(password, salt, 32);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function makeUser(id: string, at: number, patch: Partial<User> = {}): User {
  return {
    id,
    username: `collector-${id.slice(-6).toLowerCase()}`,
    displayName: "Guest Collector",
    bio: "",
    avatarSeed: parseInt(id.slice(-6), 36) % 360,
    role: "user",
    isGuest: true,
    createdAt: iso(at),
    lastSeenAt: iso(at),
    genres: [],
    settings: defaultSettings(),
    showcase: [],
    starterClaimed: false,
    ...patch,
  };
}

export function ensureGuestTx(draft: DbState, id: string, at: number): User {
  const existing = draft.users[id];
  if (existing) {
    existing.lastSeenAt = iso(at);
    return existing;
  }
  const user = makeUser(id, at);
  draft.users[id] = user;
  wallet(draft, id);
  track(draft, "user_created", at, { userId: id });
  notify(draft, { userId: id, kind: "system", title: "Welcome to NEXARA", body: "Your starter pack is waiting. Pick a universe and open it.", href: "/welcome", key: "welcome" }, at);
  return user;
}

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(24, "At most 24 characters")
  .regex(/^[a-z0-9_]+$/i, "Letters, numbers and underscores only");

export const registerInput = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(120),
  password: z.string().min(8, "At least 8 characters").max(200),
});

export function usernameTaken(state: DbState, username: string, exceptId?: string) {
  const u = username.toLowerCase();
  return Object.values(state.users).some((x) => x.id !== exceptId && x.username.toLowerCase() === u);
}

/** Converts the current guest into a full account, keeping their collection. */
export function registerTx(draft: DbState, userId: string, input: z.infer<typeof registerInput>, at: number) {
  const user = requireUser(draft, userId);
  if (!user.isGuest) throw new ServiceError("already_registered", "This collector already has an account", 409);
  if (usernameTaken(draft, input.username, userId)) throw new ServiceError("username_taken", "That username is taken", 409);
  if (Object.values(draft.users).some((u) => u.email?.toLowerCase() === input.email.toLowerCase())) throw new ServiceError("email_taken", "That email already has an account", 409);
  Object.assign(user, { username: input.username, displayName: input.displayName, email: input.email, passwordHash: hashPassword(input.password), isGuest: false });
  track(draft, "account_created", at, { userId });
  return user;
}

export function authenticate(state: DbState, username: string, password: string): User | undefined {
  const u = Object.values(state.users).find((x) => x.username.toLowerCase() === username.trim().toLowerCase() && !x.isDemo);
  return u && verifyPassword(password, u.passwordHash) ? u : undefined;
}

export const profileInput = z.object({
  displayName: z.string().trim().min(1).max(40),
  bio: z.string().trim().max(280),
  username: usernameSchema.optional(),
  avatarSeed: z.number().int().min(0).max(359).optional(),
});

export function updateProfileTx(draft: DbState, userId: string, input: z.infer<typeof profileInput>) {
  const user = requireUser(draft, userId);
  if (input.username && input.username !== user.username) {
    if (usernameTaken(draft, input.username, userId)) throw new ServiceError("username_taken", "That username is taken", 409);
    user.username = input.username;
  }
  user.displayName = input.displayName;
  user.bio = input.bio;
  if (input.avatarSeed !== undefined) user.avatarSeed = input.avatarSeed;
  return user;
}

export const settingsInput = z.object({
  sound: z.boolean(),
  haptics: z.boolean(),
  reducedMotion: z.boolean(),
  notifications: z.object({
    dailyReady: z.boolean(),
    newEpisodes: z.boolean(),
    newCards: z.boolean(),
    completions: z.boolean(),
    seasonLaunches: z.boolean(),
    events: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
  }),
});

export function updateSettingsTx(draft: DbState, userId: string, settings: UserSettings) {
  requireUser(draft, userId).settings = settings;
}

const genreIds = GENRES.map((g) => g.id) as [GenreId, ...GenreId[]];
export const onboardingInput = z.object({ genres: z.array(z.enum(genreIds)).min(1).max(12) });

export function setGenresTx(draft: DbState, userId: string, genres: GenreId[], at: number) {
  const u = requireUser(draft, userId);
  u.genres = [...new Set(genres)];
  track(draft, "genres_selected", at, { userId, props: { genres: u.genres.join(",") } });
}

export function completeOnboardingTx(draft: DbState, userId: string, at: number) {
  const u = requireUser(draft, userId);
  u.onboardedAt ??= iso(at);
  track(draft, "onboarding_completed", at, { userId });
}

export function setShowcaseTx(draft: DbState, userId: string, cardIds: string[]) {
  const u = requireUser(draft, userId);
  const inv = draft.inventory[userId] ?? {};
  const ids = [...new Set(cardIds)].slice(0, 9);
  for (const id of ids) if (!inv[id]?.count) throw new ServiceError("not_owned", "You can only showcase cards you own", 403);
  u.showcase = ids;
}

export function toggleFavouriteTx(draft: DbState, userId: string, cardId: string, at: number) {
  requireUser(draft, userId);
  if (!catalog(draft).cards.has(cardId)) throw new ServiceError("not_found", "Unknown card", 404);
  const i = draft.favourites.findIndex((f) => f.userId === userId && f.cardId === cardId);
  if (i >= 0) {
    draft.favourites.splice(i, 1);
    return false;
  }
  draft.favourites.push({ userId, cardId, at: iso(at) });
  track(draft, "card_favourited", at, { userId, props: { cardId } });
  return true;
}

export function toggleFollowUniverseTx(draft: DbState, userId: string, universeId: string, at: number) {
  requireUser(draft, userId);
  if (!catalog(draft).byId.has(universeId)) throw new ServiceError("not_found", "Unknown universe", 404);
  const i = draft.follows.findIndex((f) => f.userId === userId && f.universeId === universeId);
  if (i >= 0) {
    draft.follows.splice(i, 1);
    track(draft, "universe_unfollowed", at, { userId, universeId });
    return false;
  }
  draft.follows.push({ userId, universeId, at: iso(at) });
  track(draft, "universe_followed", at, { userId, universeId });
  evaluateAchievements(draft, userId, at);
  return true;
}

export function toggleFollowUserTx(draft: DbState, followerId: string, followeeId: string, at: number) {
  const follower = requireUser(draft, followerId);
  requireUser(draft, followeeId);
  if (followerId === followeeId) throw new ServiceError("bad_request", "You can't follow yourself");
  const i = draft.userFollows.findIndex((f) => f.followerId === followerId && f.followeeId === followeeId);
  if (i >= 0) {
    draft.userFollows.splice(i, 1);
    return false;
  }
  draft.userFollows.push({ followerId, followeeId, at: iso(at) });
  notify(draft, { userId: followeeId, kind: "social", title: `${follower.displayName} followed you`, body: "Show them your best cards in your showcase.", href: `/profile/${follower.username}`, key: `follow:${followerId}` }, at);
  return true;
}

/** Demo-only subscription toggle. No payment is taken; see docs/MONETISATION.md. */
export function setDemoCollectorPassTx(draft: DbState, userId: string, active: boolean, at: number) {
  const u = requireUser(draft, userId);
  u.collectorPassUntil = active ? iso(at + 30 * DAY_MS) : undefined;
  track(draft, active ? "demo_pass_started" : "demo_pass_cancelled", at, { userId });
  audit(draft, userId, active ? "demo-pass:start" : "demo-pass:cancel", at, userId, "Demo billing provider — no charge");
}

export function hasPass(u: User, at: number) {
  return !!u.collectorPassUntil && Date.parse(u.collectorPassUntil) > at;
}
