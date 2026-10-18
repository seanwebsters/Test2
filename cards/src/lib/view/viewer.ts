import "server-only";
import { currentUser } from "@/lib/auth/session";
import { now } from "@/lib/clock";
import { getStore } from "@/lib/db";
import type { User } from "@/lib/db/types";
import { refreshNotificationsTx } from "@/lib/services/daily";
import { hasPass } from "@/lib/services/users";
import type { ViewerInfo } from "@/components/shell/Viewer";

const lastRefresh = new Map<string, number>();

/** Loads the collector for a page render; refreshes derived notifications every few minutes. */
export async function loadViewer(): Promise<{ user: User; info: ViewerInfo }> {
  const user = (await currentUser())!;
  const at = now();
  if (!user.isDemo && at - (lastRefresh.get(user.id) ?? 0) > 5 * 60_000) {
    lastRefresh.set(user.id, at);
    await getStore().transact((d) => refreshNotificationsTx(d, user.id, at));
  }
  const s = getStore().read();
  const info: ViewerInfo = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarSeed: user.avatarSeed,
    role: user.role,
    isGuest: user.isGuest,
    settings: { sound: user.settings.sound, haptics: user.settings.haptics, reducedMotion: user.settings.reducedMotion },
    wallet: s.wallets[user.id] ?? { shards: 0, stardust: 0, tokens: {} },
    unread: s.notifications.filter((n) => n.userId === user.id && !n.readAt).length,
    hasPass: hasPass(user, at),
  };
  return { user: s.users[user.id] ?? user, info };
}
