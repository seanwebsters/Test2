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

/**
 * Persistence for private user data. Every method takes the owner's user id and
 * only ever touches that user's rows. The Supabase implementation additionally
 * runs with the user's own JWT so Postgres row-level security enforces this.
 */
export interface Store {
  getProfile(userId: string): Promise<Profile | null>;
  saveProfile(profile: Profile): Promise<void>;

  listPaths(userId: string): Promise<UserPath[]>;
  savePath(userId: string, path: UserPath): Promise<void>;

  listCompletions(userId: string): Promise<Completion[]>;
  addCompletion(userId: string, completion: Completion): Promise<void>;

  listAchievements(userId: string): Promise<UnlockedAchievement[]>;
  addAchievements(userId: string, items: UnlockedAchievement[]): Promise<void>;

  getDailyPlan(userId: string, day: string): Promise<DailyPlan | null>;
  saveDailyPlan(userId: string, plan: DailyPlan): Promise<void>;

  listCoachMessages(userId: string, limit: number): Promise<CoachMessage[]>;
  addCoachMessage(userId: string, message: CoachMessage): Promise<void>;
  countCoachMessagesSince(userId: string, sinceIso: string): Promise<number>;
  clearCoachMessages(userId: string): Promise<void>;

  listBookmarks(userId: string): Promise<Bookmark[]>;
  saveBookmark(userId: string, bookmark: Bookmark): Promise<void>;
  deleteBookmark(userId: string, opportunityId: string): Promise<void>;

  listCareerViews(userId: string): Promise<CareerView[]>;
  addCareerView(userId: string, careerSlug: string, at: string): Promise<void>;

  listPassport(userId: string): Promise<PassportItem[]>;
  savePassportItem(userId: string, item: PassportItem): Promise<void>;
  deletePassportItem(userId: string, id: string): Promise<void>;

  /**
   * Subscription state. Only the server (checkout/webhooks) calls this; in
   * Supabase it is written with the service role, never the user's token.
   */
  setSubscription(userId: string, sub: Subscription): Promise<void>;

  /** Deletes every row belonging to the user. */
  deleteUser(userId: string): Promise<void>;
}

export interface Subscription {
  plan: Profile["plan"];
  source: Profile["planSource"];
  renewsAt: string | null;
  stripeCustomerId: string | null;
}

/** Public, non-sensitive passport data for a handle, or null when private. */
export interface PublicPassportSource {
  findPublicProfile(handle: string): Promise<{ profile: Profile; completions: Completion[]; achievements: UnlockedAchievement[]; passport: PassportItem[]; paths: UserPath[] } | null>;
}
