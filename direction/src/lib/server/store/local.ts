import fs from "node:fs";
import path from "node:path";
import type {
  Bookmark,
  CareerView,
  CoachMessage,
  Completion,
  DailyPlan,
  PassportItem,
  Profile,
  UnlockedAchievement,
  UserPath,
} from "@/lib/engine/model";
import type { PublicPassportSource, Store, Subscription } from "./types";

export interface LocalAccount {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface UserBlob {
  profile: Profile | null;
  paths: UserPath[];
  completions: Completion[];
  achievements: UnlockedAchievement[];
  dailyPlans: DailyPlan[];
  coachMessages: CoachMessage[];
  bookmarks: Bookmark[];
  careerViews: CareerView[];
  passport: PassportItem[];
}

interface Snapshot {
  version: 1;
  accounts: LocalAccount[];
  users: Record<string, UserBlob>;
}

const emptyBlob = (): UserBlob => ({
  profile: null,
  paths: [],
  completions: [],
  achievements: [],
  dailyPlans: [],
  coachMessages: [],
  bookmarks: [],
  careerViews: [],
  passport: [],
});

const clone = <T>(v: T): T => structuredClone(v);

/**
 * A JSON-file store for local development, demos and tests. Writes are
 * serialised and atomic (write to temp file, then rename).
 */
export class LocalStore implements Store, PublicPassportSource {
  private data: Snapshot;
  private writing: Promise<void> = Promise.resolve();

  constructor(private file: string | null, initial?: Snapshot) {
    this.data = initial ?? { version: 1, accounts: [], users: {} };
  }

  static fromFile(file: string): LocalStore {
    let initial: Snapshot | undefined;
    try {
      initial = JSON.parse(fs.readFileSync(file, "utf8")) as Snapshot;
    } catch {
      initial = undefined;
    }
    return new LocalStore(file, initial);
  }

  static inMemory(): LocalStore {
    return new LocalStore(null);
  }

  private blob(userId: string): UserBlob {
    return (this.data.users[userId] ??= emptyBlob());
  }

  private async persist(): Promise<void> {
    if (!this.file) return;
    const file = this.file;
    const json = JSON.stringify(this.data);
    this.writing = this.writing.then(async () => {
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await fs.promises.writeFile(tmp, json);
      await fs.promises.rename(tmp, file);
    });
    return this.writing;
  }

  // ── Accounts (local auth only) ──
  async findAccountByEmail(email: string): Promise<LocalAccount | null> {
    const a = this.data.accounts.find((x) => x.email === email.toLowerCase());
    return a ? clone(a) : null;
  }

  async createAccount(account: LocalAccount): Promise<void> {
    if (this.data.accounts.some((a) => a.email === account.email)) throw new Error("Account exists");
    this.data.accounts.push(clone(account));
    await this.persist();
  }

  // ── Profile ──
  async getProfile(userId: string) {
    const p = this.data.users[userId]?.profile;
    return p ? clone(p) : null;
  }

  async saveProfile(profile: Profile) {
    this.blob(profile.id).profile = clone(profile);
    await this.persist();
  }

  // ── Paths ──
  async listPaths(userId: string) {
    return clone(this.data.users[userId]?.paths ?? []);
  }

  async savePath(userId: string, p: UserPath) {
    const b = this.blob(userId);
    b.paths = [...b.paths.filter((x) => x.careerSlug !== p.careerSlug), clone(p)];
    await this.persist();
  }

  // ── Completions ──
  async listCompletions(userId: string) {
    return clone(this.data.users[userId]?.completions ?? []);
  }

  async addCompletion(userId: string, c: Completion) {
    const b = this.blob(userId);
    if (b.completions.some((x) => x.missionId === c.missionId)) throw new Error("Mission already completed");
    b.completions.push(clone(c));
    await this.persist();
  }

  // ── Achievements ──
  async listAchievements(userId: string) {
    return clone(this.data.users[userId]?.achievements ?? []);
  }

  async addAchievements(userId: string, items: UnlockedAchievement[]) {
    const b = this.blob(userId);
    for (const i of items) if (!b.achievements.some((a) => a.achievementId === i.achievementId)) b.achievements.push(clone(i));
    await this.persist();
  }

  // ── Daily plans ──
  async getDailyPlan(userId: string, day: string) {
    const p = this.data.users[userId]?.dailyPlans.find((x) => x.day === day);
    return p ? clone(p) : null;
  }

  async saveDailyPlan(userId: string, plan: DailyPlan) {
    const b = this.blob(userId);
    b.dailyPlans = [...b.dailyPlans.filter((x) => x.day !== plan.day), clone(plan)].slice(-60);
    await this.persist();
  }

  // ── Coach ──
  async listCoachMessages(userId: string, limit: number) {
    const all = this.data.users[userId]?.coachMessages ?? [];
    return clone(all.slice(-limit));
  }

  async addCoachMessage(userId: string, m: CoachMessage) {
    const b = this.blob(userId);
    b.coachMessages.push(clone(m));
    if (b.coachMessages.length > 500) b.coachMessages = b.coachMessages.slice(-500);
    await this.persist();
  }

  async countCoachMessagesSince(userId: string, sinceIso: string) {
    return (this.data.users[userId]?.coachMessages ?? []).filter((m) => m.role === "user" && m.createdAt >= sinceIso).length;
  }

  async clearCoachMessages(userId: string) {
    this.blob(userId).coachMessages = [];
    await this.persist();
  }

  // ── Bookmarks ──
  async listBookmarks(userId: string) {
    return clone(this.data.users[userId]?.bookmarks ?? []);
  }

  async saveBookmark(userId: string, bm: Bookmark) {
    const b = this.blob(userId);
    b.bookmarks = [...b.bookmarks.filter((x) => x.opportunityId !== bm.opportunityId), clone(bm)];
    await this.persist();
  }

  async deleteBookmark(userId: string, opportunityId: string) {
    const b = this.blob(userId);
    b.bookmarks = b.bookmarks.filter((x) => x.opportunityId !== opportunityId);
    await this.persist();
  }

  // ── Career views ──
  async listCareerViews(userId: string) {
    return clone(this.data.users[userId]?.careerViews ?? []);
  }

  async addCareerView(userId: string, careerSlug: string, at: string) {
    const b = this.blob(userId);
    b.careerViews = [...b.careerViews.filter((v) => v.careerSlug !== careerSlug), { careerSlug, viewedAt: at }].slice(-200);
    await this.persist();
  }

  // ── Passport ──
  async listPassport(userId: string) {
    return clone(this.data.users[userId]?.passport ?? []);
  }

  async savePassportItem(userId: string, item: PassportItem) {
    const b = this.blob(userId);
    b.passport = [...b.passport.filter((x) => x.id !== item.id), clone(item)];
    await this.persist();
  }

  async deletePassportItem(userId: string, id: string) {
    const b = this.blob(userId);
    b.passport = b.passport.filter((x) => x.id !== id);
    await this.persist();
  }

  async setSubscription(userId: string, sub: Subscription) {
    const p = this.blob(userId).profile;
    if (!p) throw new Error("No profile");
    p.plan = sub.plan;
    p.planSource = sub.source;
    p.planRenewsAt = sub.renewsAt;
    p.stripeCustomerId = sub.stripeCustomerId;
    await this.persist();
  }

  async findUserIdByStripeCustomer(customerId: string): Promise<string | null> {
    return Object.entries(this.data.users).find(([, u]) => u.profile?.stripeCustomerId === customerId)?.[0] ?? null;
  }

  async deleteUser(userId: string) {
    delete this.data.users[userId];
    this.data.accounts = this.data.accounts.filter((a) => a.id !== userId);
    await this.persist();
  }

  // ── Public passport ──
  async findPublicProfile(handle: string) {
    const entry = Object.values(this.data.users).find((u) => u.profile?.handle === handle.toLowerCase());
    if (!entry?.profile?.privacy.passportPublic) return null;
    return clone({
      profile: entry.profile,
      completions: entry.completions,
      achievements: entry.achievements,
      passport: entry.passport.filter((p) => p.isPublic),
      paths: entry.paths,
    });
  }

  async handleTaken(handle: string, exceptUserId?: string): Promise<boolean> {
    return Object.entries(this.data.users).some(([id, u]) => id !== exceptUserId && u.profile?.handle === handle);
  }
}
