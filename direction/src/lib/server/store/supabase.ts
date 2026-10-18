import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PRIVACY,
  EMPTY_STREAK,
  type Bookmark,
  type CareerView,
  type CoachMessage,
  type Completion,
  type DailyPlan,
  type PassportItem,
  type Profile,
  type UnlockedAchievement,
  type UserPath,
} from "@/lib/engine/model";
import { env } from "../env";
import type { PublicPassportSource, Store, Subscription } from "./types";

type Row = Record<string, unknown>;

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

/** A client that acts as the signed-in user, so row-level security applies. */
export function userClient(accessToken: string): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/** Service-role client for server-only operations (subscriptions, public passports). */
export function adminClient(): SupabaseClient | null {
  if (!env.supabaseServiceRoleKey) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const toProfile = (r: Row, sub: Row | null): Profile => ({
  id: r.id as string,
  email: (r.email as string) ?? null,
  displayName: (r.display_name as string) ?? "",
  handle: r.handle as string,
  createdAt: r.created_at as string,
  onboarding: (r.onboarding as Profile["onboarding"]) ?? null,
  onboardedAt: (r.onboarded_at as string) ?? null,
  matches: (r.matches as Profile["matches"]) ?? [],
  timezone: (r.timezone as string) ?? "Europe/London",
  plan: ((sub?.plan as Profile["plan"]) ?? "free"),
  planSource: ((sub?.source as Profile["planSource"]) ?? "none"),
  planRenewsAt: (sub?.renews_at as string) ?? null,
  stripeCustomerId: (sub?.stripe_customer_id as string) ?? null,
  streak: { ...EMPTY_STREAK, ...((r.streak as object) ?? {}) },
  privacy: { ...DEFAULT_PRIVACY, ...((r.privacy as object) ?? {}) },
  challenge: (r.challenge as Profile["challenge"]) ?? null,
  isDemo: !!r.is_demo,
});

const toPath = (r: Row): UserPath => ({
  careerSlug: r.career_slug as string,
  status: r.status as UserPath["status"],
  startedAt: r.started_at as string,
  skippedThrough: (r.skipped_through as number) ?? 0,
  lastActiveAt: r.last_active_at as string,
});

const toCompletion = (r: Row): Completion => ({
  id: r.id as string,
  missionId: r.mission_id as string,
  careerSlug: r.career_slug as string,
  completedAt: r.completed_at as string,
  day: r.day as string,
  evidence: (r.evidence as string) ?? null,
  reflection: (r.reflection as string) ?? null,
  rating: (r.rating as Completion["rating"]) ?? null,
  xp: r.xp as number,
  skillPoints: (r.skill_points as Completion["skillPoints"]) ?? [],
  source: r.source as Completion["source"],
});

const toPassport = (r: Row): PassportItem => ({
  id: r.id as string,
  kind: r.kind as PassportItem["kind"],
  title: r.title as string,
  organisation: (r.organisation as string) ?? "",
  startDate: (r.start_date as string) ?? null,
  endDate: (r.end_date as string) ?? null,
  description: (r.description as string) ?? "",
  url: (r.url as string) ?? null,
  isPublic: !!r.is_public,
  createdAt: r.created_at as string,
});

/**
 * Postgres-backed store. Each instance is bound to one user's access token, so
 * every query runs under RLS as that user.
 */
export class SupabaseStore implements Store {
  constructor(private db: SupabaseClient) {}

  async getProfile(userId: string) {
    const r = check(await this.db.from("profiles").select("*").eq("id", userId).maybeSingle());
    if (!r) return null;
    const sub = check(await this.db.from("subscriptions").select("*").eq("user_id", userId).maybeSingle());
    return toProfile(r as Row, (sub as Row) ?? null);
  }

  async saveProfile(p: Profile) {
    check(
      await this.db.from("profiles").upsert({
        id: p.id,
        email: p.email,
        display_name: p.displayName,
        handle: p.handle,
        created_at: p.createdAt,
        onboarding: p.onboarding,
        onboarded_at: p.onboardedAt,
        matches: p.matches,
        timezone: p.timezone,
        streak: p.streak,
        privacy: p.privacy,
        challenge: p.challenge,
        is_demo: p.isDemo,
      }),
    );
  }

  async listPaths(userId: string) {
    return (check(await this.db.from("user_paths").select("*").eq("user_id", userId)) as Row[]).map(toPath);
  }

  async savePath(userId: string, p: UserPath) {
    check(
      await this.db.from("user_paths").upsert({
        user_id: userId,
        career_slug: p.careerSlug,
        status: p.status,
        started_at: p.startedAt,
        skipped_through: p.skippedThrough,
        last_active_at: p.lastActiveAt,
      }),
    );
  }

  async listCompletions(userId: string) {
    return (check(await this.db.from("mission_completions").select("*").eq("user_id", userId).order("completed_at")) as Row[]).map(toCompletion);
  }

  async addCompletion(userId: string, c: Completion) {
    check(
      await this.db.from("mission_completions").insert({
        id: c.id,
        user_id: userId,
        mission_id: c.missionId,
        career_slug: c.careerSlug,
        completed_at: c.completedAt,
        day: c.day,
        evidence: c.evidence,
        reflection: c.reflection,
        rating: c.rating,
        xp: c.xp,
        skill_points: c.skillPoints,
        source: c.source,
      }),
    );
  }

  async listAchievements(userId: string) {
    return (check(await this.db.from("user_achievements").select("*").eq("user_id", userId)) as Row[]).map((r) => ({
      achievementId: r.achievement_id as string,
      unlockedAt: r.unlocked_at as string,
    }));
  }

  async addAchievements(userId: string, items: UnlockedAchievement[]) {
    if (!items.length) return;
    check(
      await this.db
        .from("user_achievements")
        .upsert(items.map((i) => ({ user_id: userId, achievement_id: i.achievementId, unlocked_at: i.unlockedAt })), { ignoreDuplicates: true }),
    );
  }

  async getDailyPlan(userId: string, day: string) {
    const r = check(await this.db.from("daily_plans").select("*").eq("user_id", userId).eq("day", day).maybeSingle()) as Row | null;
    return r ? { day: r.day as string, missionIds: r.mission_ids as string[], createdAt: r.created_at as string } : null;
  }

  async saveDailyPlan(userId: string, plan: DailyPlan) {
    check(await this.db.from("daily_plans").upsert({ user_id: userId, day: plan.day, mission_ids: plan.missionIds, created_at: plan.createdAt }));
  }

  async listCoachMessages(userId: string, limit: number) {
    const rows = check(await this.db.from("coach_messages").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit)) as Row[];
    return rows.reverse().map((r) => ({
      id: r.id as string,
      role: r.role as CoachMessage["role"],
      content: r.content as string,
      createdAt: r.created_at as string,
      provider: (r.provider as CoachMessage["provider"]) ?? null,
    }));
  }

  async addCoachMessage(userId: string, m: CoachMessage) {
    check(await this.db.from("coach_messages").insert({ id: m.id, user_id: userId, role: m.role, content: m.content, created_at: m.createdAt, provider: m.provider }));
  }

  async countCoachMessagesSince(userId: string, sinceIso: string) {
    const res = await this.db.from("coach_messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("role", "user").gte("created_at", sinceIso);
    if (res.error) throw new Error(`Supabase: ${res.error.message}`);
    return res.count ?? 0;
  }

  async clearCoachMessages(userId: string) {
    check(await this.db.from("coach_messages").delete().eq("user_id", userId));
  }

  async listBookmarks(userId: string) {
    return (check(await this.db.from("opportunity_bookmarks").select("*").eq("user_id", userId)) as Row[]).map((r) => ({
      opportunityId: r.opportunity_id as string,
      status: r.status as Bookmark["status"],
      notes: (r.notes as string) ?? "",
      updatedAt: r.updated_at as string,
      snapshot: (r.snapshot as Bookmark["snapshot"]) ?? null,
    }));
  }

  async saveBookmark(userId: string, b: Bookmark) {
    check(
      await this.db.from("opportunity_bookmarks").upsert({
        user_id: userId,
        opportunity_id: b.opportunityId,
        status: b.status,
        notes: b.notes,
        updated_at: b.updatedAt,
        snapshot: b.snapshot,
      }),
    );
  }

  async deleteBookmark(userId: string, opportunityId: string) {
    check(await this.db.from("opportunity_bookmarks").delete().eq("user_id", userId).eq("opportunity_id", opportunityId));
  }

  async listCareerViews(userId: string) {
    return (check(await this.db.from("career_views").select("*").eq("user_id", userId)) as Row[]).map(
      (r): CareerView => ({ careerSlug: r.career_slug as string, viewedAt: r.viewed_at as string }),
    );
  }

  async addCareerView(userId: string, careerSlug: string, at: string) {
    check(await this.db.from("career_views").upsert({ user_id: userId, career_slug: careerSlug, viewed_at: at }));
  }

  async listPassport(userId: string) {
    return (check(await this.db.from("passport_items").select("*").eq("user_id", userId).order("created_at")) as Row[]).map(toPassport);
  }

  async savePassportItem(userId: string, i: PassportItem) {
    check(
      await this.db.from("passport_items").upsert({
        id: i.id,
        user_id: userId,
        kind: i.kind,
        title: i.title,
        organisation: i.organisation,
        start_date: i.startDate,
        end_date: i.endDate,
        description: i.description,
        url: i.url,
        is_public: i.isPublic,
        created_at: i.createdAt,
      }),
    );
  }

  async deletePassportItem(userId: string, id: string) {
    check(await this.db.from("passport_items").delete().eq("user_id", userId).eq("id", id));
  }

  async setSubscription(userId: string, sub: Subscription) {
    const admin = adminClient();
    if (!admin) throw new Error("Updating subscriptions requires SUPABASE_SERVICE_ROLE_KEY on the server.");
    check(
      await admin.from("subscriptions").upsert({
        user_id: userId,
        plan: sub.plan,
        source: sub.source,
        renews_at: sub.renewsAt,
        stripe_customer_id: sub.stripeCustomerId,
        updated_at: new Date().toISOString(),
      }),
    );
  }

  async deleteUser(userId: string) {
    // Cascades from profiles remove every owned row. The auth user is removed with the service role if available.
    check(await this.db.from("profiles").delete().eq("id", userId));
    const admin = adminClient();
    if (admin) await admin.auth.admin.deleteUser(userId);
  }
}

/** Public passports are read through a security-definer function that only returns opted-in data. */
export class SupabasePublicPassports implements PublicPassportSource {
  async findPublicProfile(handle: string) {
    const db = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false } });
    const res = await db.rpc("get_public_passport", { p_handle: handle.toLowerCase() });
    if (res.error || !res.data) return null;
    const d = res.data as { profile: Row; completions: Row[]; achievements: Row[]; passport: Row[]; paths: Row[] };
    return {
      profile: toProfile(d.profile, null),
      completions: (d.completions ?? []).map(toCompletion),
      achievements: (d.achievements ?? []).map((r) => ({ achievementId: r.achievement_id as string, unlockedAt: r.unlocked_at as string })),
      passport: (d.passport ?? []).map(toPassport),
      paths: (d.paths ?? []).map(toPath),
    };
  }
}

export async function findUserIdByStripeCustomer(customerId: string): Promise<string | null> {
  const admin = adminClient();
  if (!admin) return null;
  const r = check(await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle()) as Row | null;
  return (r?.user_id as string) ?? null;
}
