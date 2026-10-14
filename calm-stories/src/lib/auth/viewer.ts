import type { Plan, Role, User } from "@/lib/types";

/**
 * Everything the app knows about the current visitor. Built by an
 * IdentityProvider + EntitlementProvider so Calm's real identity and
 * subscription services can replace the prototype ones.
 */
export interface Viewer {
  user: User | null;
  roles: Role[];
  /** "visitor" = not signed in. */
  plan: Plan | "visitor";
  isPremium: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  entitlementSource: "mock" | "calm" | null;
}

export const VISITOR: Viewer = {
  user: null,
  roles: [],
  plan: "visitor",
  isPremium: false,
  isCreator: false,
  isAdmin: false,
  entitlementSource: null,
};

/** Shape sent to client components – no emails or internal fields. */
export interface PublicViewer {
  id: string | null;
  username: string | null;
  displayName: string | null;
  avatarHue: number;
  plan: Viewer["plan"];
  isPremium: boolean;
  isCreator: boolean;
  isAdmin: boolean;
}

export function toPublicViewer(v: Viewer): PublicViewer {
  return {
    id: v.user?.id ?? null,
    username: v.user?.username ?? null,
    displayName: v.user?.display_name ?? null,
    avatarHue: v.user?.avatar_hue ?? 240,
    plan: v.plan,
    isPremium: v.isPremium,
    isCreator: v.isCreator,
    isAdmin: v.isAdmin,
  };
}
