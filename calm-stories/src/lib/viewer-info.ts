import type { Viewer } from "@/lib/auth/policy";
import { canCreate, isAdmin, isEditor, isPremium, tierOf, type Tier } from "@/lib/auth/policy";

/** Serializable subset of the viewer that client components may see. */
export interface ViewerInfo {
  signedIn: boolean;
  userId: string | null;
  username: string | null;
  displayName: string | null;
  hue: number;
  tier: Tier;
  premium: boolean;
  creator: boolean;
  admin: boolean;
  editor: boolean;
}

export function toViewerInfo(v: Viewer): ViewerInfo {
  return {
    signedIn: Boolean(v.user),
    userId: v.user?.id ?? null,
    username: v.user?.username ?? null,
    displayName: v.user?.display_name ?? null,
    hue: v.user?.avatar_hue ?? 240,
    tier: tierOf(v),
    premium: isPremium(v),
    creator: canCreate(v),
    admin: isAdmin(v),
    editor: isEditor(v),
  };
}
