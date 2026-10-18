import type { UserRecord } from "./model";
import { DAILY_FREE_SECONDS, aiAllowance, isPlus } from "./entitlements";

/** What the browser is allowed to know about the signed-in listener. */
export function toClientState(u: UserRecord, today: string) {
  const month = today.slice(0, 7);
  return {
    id: u.id,
    handle: u.handle,
    displayName: u.displayName,
    avatarHue: u.avatarHue,
    bio: u.bio,
    isPublic: u.isPublic,
    signedIn: u.id.startsWith("sb_"),
    email: u.email ?? null,
    onboarded: u.onboarded,
    interests: u.interests,
    learnStyle: u.learnStyle,
    progress: u.progress,
    following: u.following,
    favourites: u.favourites,
    insights: u.insights,
    cards: u.cards,
    xp: u.xp,
    xpLog: u.xpLog.slice(-30),
    streak: u.streak,
    days: u.days,
    hours: u.hours,
    challenges: u.challenges,
    exploredCategories: u.exploredCategories,
    completedSeries: u.completedSeries,
    credits: u.credits,
    unlocked: u.unlocked,
    transactions: u.transactions.slice(-40).reverse(),
    subscription: { status: u.subscription.status, provider: u.subscription.provider ?? null, renewsAt: u.subscription.renewsAt ?? null },
    plus: isPlus(u),
    followedCollections: u.followedCollections,
    aiSeries: u.aiSeries,
    ai: aiAllowance(u, month),
    today,
    todaySeconds: u.days[today] ?? 0,
    dailyLimitSeconds: DAILY_FREE_SECONDS,
  };
}

export type ClientState = ReturnType<typeof toClientState>;
