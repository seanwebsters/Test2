import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AiJobRecord, AiSeriesRecord, CollectionRecord, UserRecord } from "../model";
import type { Store } from "./types";

/**
 * Supabase adapter over the normalised schema in supabase/schema.sql.
 *
 * The domain layer works on a whole UserRecord (load → mutate → save). Saving maps
 * the record to table rows and diffs them against the rows of the previously loaded
 * record, so each save only upserts changed rows and deletes removed ones.
 * Uses the service-role key, server-side only; RLS policies protect direct client access.
 */
type Row = Record<string, unknown>;
interface TableSpec {
  table: string;
  key: string[];
  rows: (u: UserRecord) => Row[];
}

const TABLES: TableSpec[] = [
  {
    table: "profiles",
    key: ["id"],
    rows: (u) => [
      {
        id: u.id, handle: u.handle, display_name: u.displayName, email: u.email ?? null, avatar_hue: u.avatarHue,
        created_at: u.createdAt, onboarded: u.onboarded, interests: u.interests, learn_style: u.learnStyle, bio: u.bio,
        is_public: u.isPublic, xp: u.xp, explored_categories: u.exploredCategories, completed_series: u.completedSeries,
        listening_hours: u.hours, ai_month: u.aiGenerationsThisMonth.month, ai_count: u.aiGenerationsThisMonth.count,
      },
    ],
  },
  { table: "streaks", key: ["user_id"], rows: (u) => [{ user_id: u.id, current: u.streak.current, longest: u.streak.longest, last_day: u.streak.lastDay ?? null }] },
  { table: "credit_balances", key: ["user_id"], rows: (u) => [{ user_id: u.id, credits: u.credits }] },
  {
    table: "subscriptions",
    key: ["user_id"],
    rows: (u) => [{
      user_id: u.id, status: u.subscription.status, plan: u.subscription.plan ?? null, provider: u.subscription.provider ?? null,
      renews_at: u.subscription.renewsAt ?? null, stripe_customer_id: u.subscription.stripeCustomerId ?? null,
      stripe_subscription_id: u.subscription.stripeSubscriptionId ?? null,
    }],
  },
  {
    table: "listening_progress",
    key: ["user_id", "episode_id"],
    rows: (u) => Object.entries(u.progress).map(([episode_id, p]) => ({
      user_id: u.id, episode_id, position: p.position, duration: p.duration, completed: p.completed,
      completed_at: p.completedAt ?? null, updated_at: p.updatedAt, listened: p.listened,
    })),
  },
  { table: "listening_days", key: ["user_id", "day"], rows: (u) => Object.entries(u.days).map(([day, seconds]) => ({ user_id: u.id, day, seconds })) },
  { table: "series_follows", key: ["user_id", "series_slug"], rows: (u) => u.following.map((series_slug) => ({ user_id: u.id, series_slug })) },
  { table: "series_favourites", key: ["user_id", "series_slug"], rows: (u) => u.favourites.map((series_slug) => ({ user_id: u.id, series_slug })) },
  { table: "saved_insights", key: ["id"], rows: (u) => u.insights.map((i) => ({ id: i.id, user_id: u.id, episode_id: i.episodeId, text: i.text, saved_at: i.savedAt })) },
  { table: "knowledge_cards", key: ["id"], rows: (u) => u.cards.map((c) => ({ id: c.id, user_id: u.id, card_key: c.key, rarity: c.rarity, unlocked_at: c.unlockedAt })) },
  { table: "achievements", key: ["user_id", "at", "reason"], rows: (u) => u.xpLog.map((x) => ({ user_id: u.id, at: x.at, amount: x.amount, reason: x.reason })) },
  {
    table: "challenge_attempts",
    key: ["user_id", "episode_id"],
    rows: (u) => Object.entries(u.challenges).map(([episode_id, c]) => ({ user_id: u.id, episode_id, correct: c.correct, first_try: c.firstTry, attempts: c.attempts, answered_at: c.answeredAt })),
  },
  { table: "episode_unlocks", key: ["user_id", "episode_id"], rows: (u) => u.unlocked.map((episode_id) => ({ user_id: u.id, episode_id })) },
  {
    table: "credit_transactions",
    key: ["id"],
    rows: (u) => u.transactions.map((t) => ({ id: `${u.id}:${t.id}`, user_id: u.id, at: t.at, kind: t.kind, credits: t.credits, amount_pence: t.amountPence ?? null, description: t.description, provider: t.provider })),
  },
  { table: "collection_follows", key: ["user_id", "collection_id"], rows: (u) => u.followedCollections.map((collection_id) => ({ user_id: u.id, collection_id })) },
  { table: "ai_series_library", key: ["user_id", "ai_series_id"], rows: (u) => u.aiSeries.map((ai_series_id) => ({ user_id: u.id, ai_series_id })) },
];

const keyOf = (spec: TableSpec, r: Row) => spec.key.map((k) => String(r[k])).join("|");

let client: SupabaseClient | null = null;
function db() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  }
  return client;
}

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data;
}

async function loadUser(id: string): Promise<UserRecord | null> {
  const d = db();
  const profile = (await must(d.from("profiles").select("*").eq("id", id).maybeSingle())) as Row | null;
  if (!profile) return null;
  const by = (table: string) => must(d.from(table).select("*").eq("user_id", id)) as Promise<Row[]>;
  const [streak, credits, sub, progress, days, follows, favs, insights, cards, ach, challenges, unlocks, txs, cfollows, ai] = await Promise.all(
    ["streaks", "credit_balances", "subscriptions", "listening_progress", "listening_days", "series_follows", "series_favourites", "saved_insights", "knowledge_cards", "achievements", "challenge_attempts", "episode_unlocks", "credit_transactions", "collection_follows", "ai_series_library"].map(by),
  );
  const s = sub[0] ?? {};
  return {
    id,
    handle: profile.handle as string,
    displayName: profile.display_name as string,
    email: (profile.email as string) ?? undefined,
    avatarHue: profile.avatar_hue as number,
    createdAt: profile.created_at as string,
    onboarded: profile.onboarded as boolean,
    interests: (profile.interests as UserRecord["interests"]) ?? [],
    learnStyle: profile.learn_style as UserRecord["learnStyle"],
    bio: (profile.bio as string) ?? "",
    isPublic: profile.is_public as boolean,
    xp: profile.xp as number,
    exploredCategories: (profile.explored_categories as UserRecord["exploredCategories"]) ?? [],
    completedSeries: (profile.completed_series as string[]) ?? [],
    hours: (profile.listening_hours as number[]) ?? Array(24).fill(0),
    aiGenerationsThisMonth: { month: (profile.ai_month as string) ?? "", count: (profile.ai_count as number) ?? 0 },
    streak: { current: (streak[0]?.current as number) ?? 0, longest: (streak[0]?.longest as number) ?? 0, lastDay: (streak[0]?.last_day as string) ?? undefined },
    credits: (credits[0]?.credits as number) ?? 0,
    subscription: {
      status: (s.status as UserRecord["subscription"]["status"]) ?? "none",
      plan: (s.plan as "plus_monthly") ?? undefined,
      provider: (s.provider as "simulated" | "stripe") ?? undefined,
      renewsAt: (s.renews_at as string) ?? undefined,
      stripeCustomerId: (s.stripe_customer_id as string) ?? undefined,
      stripeSubscriptionId: (s.stripe_subscription_id as string) ?? undefined,
    },
    progress: Object.fromEntries(progress.map((p) => [p.episode_id as string, {
      position: p.position as number, duration: p.duration as number, completed: p.completed as boolean,
      completedAt: (p.completed_at as string) ?? undefined, updatedAt: p.updated_at as string, listened: p.listened as number,
    }])),
    days: Object.fromEntries(days.map((r) => [r.day as string, r.seconds as number])),
    following: follows.map((r) => r.series_slug as string),
    favourites: favs.map((r) => r.series_slug as string),
    insights: insights.map((r) => ({ id: r.id as string, episodeId: r.episode_id as string, text: r.text as string, savedAt: r.saved_at as string })).sort((a, b) => a.savedAt.localeCompare(b.savedAt)),
    cards: cards.map((r) => ({ id: r.id as string, key: r.card_key as string, rarity: r.rarity as UserRecord["cards"][number]["rarity"], unlockedAt: r.unlocked_at as string })).sort((a, b) => a.unlockedAt.localeCompare(b.unlockedAt)),
    xpLog: ach.map((r) => ({ at: r.at as string, amount: r.amount as number, reason: r.reason as string })).sort((a, b) => a.at.localeCompare(b.at)),
    challenges: Object.fromEntries(challenges.map((r) => [r.episode_id as string, { correct: r.correct as boolean, firstTry: r.first_try as boolean, attempts: r.attempts as number, answeredAt: r.answered_at as string }])),
    unlocked: unlocks.map((r) => r.episode_id as string),
    transactions: txs
      .map((r) => ({ id: String(r.id).split(":").slice(1).join(":"), at: r.at as string, kind: r.kind as UserRecord["transactions"][number]["kind"], credits: r.credits as number, amountPence: (r.amount_pence as number) ?? undefined, description: r.description as string, provider: r.provider as UserRecord["transactions"][number]["provider"] }))
      .sort((a, b) => a.at.localeCompare(b.at)),
    followedCollections: cfollows.map((r) => r.collection_id as string),
    aiSeries: ai.map((r) => r.ai_series_id as string),
  };
}

const collectionToRow = (c: CollectionRecord) => ({
  id: c.id, owner_id: c.ownerId, owner_handle: c.ownerHandle, owner_name: c.ownerName, title: c.title, description: c.description,
  series_slugs: c.seriesSlugs, is_public: c.isPublic, editorial: c.editorial, followers: c.followers, created_at: c.createdAt, updated_at: c.updatedAt, palette: c.palette,
});
const rowToCollection = (r: Row): CollectionRecord => ({
  id: r.id as string, ownerId: r.owner_id as string, ownerHandle: r.owner_handle as string, ownerName: r.owner_name as string, title: r.title as string,
  description: r.description as string, seriesSlugs: r.series_slugs as string[], isPublic: r.is_public as boolean, editorial: r.editorial as boolean,
  followers: r.followers as number, createdAt: r.created_at as string, updatedAt: r.updated_at as string, palette: r.palette as [string, string],
});

export const supabaseStore: Store = {
  kind: "supabase",
  getUser: loadUser,
  async saveUser(user, previous) {
    const d = db();
    // profiles first: every other table references it.
    for (const spec of TABLES) {
      const next = spec.rows(user);
      const prev = previous ? spec.rows(previous) : [];
      const prevMap = new Map(prev.map((r) => [keyOf(spec, r), JSON.stringify(r)]));
      const nextKeys = new Set(next.map((r) => keyOf(spec, r)));
      const changed = next.filter((r) => prevMap.get(keyOf(spec, r)) !== JSON.stringify(r));
      if (changed.length) await must(d.from(spec.table).upsert(changed, { onConflict: spec.key.join(",") }));
      const removed = prev.filter((r) => !nextKeys.has(keyOf(spec, r)));
      for (const r of removed) {
        let q = d.from(spec.table).delete();
        for (const k of spec.key) q = q.eq(k, r[k] as string);
        await must(q);
      }
    }
  },
  async findUserByHandle(handle) {
    const row = (await must(db().from("profiles").select("id").eq("handle", handle.toLowerCase()).maybeSingle())) as Row | null;
    return row ? loadUser(row.id as string) : null;
  },
  async findUserByStripeCustomer(customerId) {
    const row = (await must(db().from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle())) as Row | null;
    return row ? loadUser(row.user_id as string) : null;
  },
  async listCollections() {
    return ((await must(db().from("collections").select("*"))) as Row[]).map(rowToCollection);
  },
  async getCollection(id) {
    const r = (await must(db().from("collections").select("*").eq("id", id).maybeSingle())) as Row | null;
    return r ? rowToCollection(r) : null;
  },
  async saveCollection(c) {
    await must(db().from("collections").upsert(collectionToRow(c)));
  },
  async deleteCollection(id) {
    await must(db().from("collections").delete().eq("id", id));
  },
  async getAiSeries(id) {
    const r = (await must(db().from("ai_series").select("data").eq("id", id).maybeSingle())) as Row | null;
    return r ? (r.data as AiSeriesRecord) : null;
  },
  async saveAiSeries(s) {
    await must(db().from("ai_series").upsert({ id: s.id, owner_id: s.ownerId, prompt: s.prompt, mode: s.mode, title: s.title, category: s.category, created_at: s.createdAt, data: s }));
  },
  async getJob(id) {
    const r = (await must(db().from("ai_generation_jobs").select("*").eq("id", id).maybeSingle())) as Row | null;
    return r
      ? { id: r.id as string, ownerId: r.owner_id as string, prompt: r.prompt as string, mode: r.mode as "live" | "demo", status: r.status as AiJobRecord["status"], steps: r.steps as AiJobRecord["steps"], seriesId: (r.series_id as string) ?? undefined, error: (r.error as string) ?? undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string }
      : null;
  },
  async saveJob(j) {
    await must(db().from("ai_generation_jobs").upsert({ id: j.id, owner_id: j.ownerId, prompt: j.prompt, mode: j.mode, status: j.status, steps: j.steps, series_id: j.seriesId ?? null, error: j.error ?? null, created_at: j.createdAt, updated_at: j.updatedAt }));
  },
  async putAudio(key, data) {
    const { error } = await db().storage.from("ai-audio").upload(key, data, { contentType: "audio/mpeg", upsert: true });
    if (error) throw new Error(`Supabase storage: ${error.message}`);
  },
  async getAudio(key) {
    const { data, error } = await db().storage.from("ai-audio").download(key);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  },
};
