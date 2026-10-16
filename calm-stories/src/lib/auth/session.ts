import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { forbidden, unauthorized } from "@/lib/errors";
import type { Role } from "@/lib/types";
import { ANONYMOUS, isAdmin, isEditor, type Viewer } from "./policy";
import { DEV_COOKIE, getAuthProvider, getEntitlementProvider, SESSION_COOKIE } from "./providers";
import { signToken } from "./session-token";

export async function loadViewer(userId: string | null): Promise<Viewer> {
  if (!userId) return ANONYMOUS;
  const db = getDb();
  const user = await db.get("users", userId);
  if (!user) return ANONYMOUS;
  const roles = (await db.list("user_roles", { where: { user_id: userId } })).map((r) => r.role as Role);
  const plan = await getEntitlementProvider().getPlan(userId);
  return { user, roles, plan };
}

/** The current viewer for this request (memoised per render). */
export const getViewer = cache(async (): Promise<Viewer> => {
  const jar = await cookies();
  const uid = await getAuthProvider().resolveUserId(jar);
  return loadViewer(uid);
});

export async function requireUser(): Promise<Viewer & { user: NonNullable<Viewer["user"]> }> {
  const v = await getViewer();
  if (!v.user) throw unauthorized();
  return v as Viewer & { user: NonNullable<Viewer["user"]> };
}

export async function requireAdmin() {
  const v = await requireUser();
  if (!isAdmin(v)) throw forbidden("Administrator access required.");
  return v;
}

export async function requireEditor() {
  const v = await requireUser();
  if (!isEditor(v)) throw forbidden("Editorial access required.");
  return v;
}

export async function startDemoSession(userId: string) {
  const jar = await cookies();
  const token = signToken({ uid: userId, exp: Date.now() + 30 * 86400000 }, env.sessionSecret);
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appEnv === "production",
    path: "/",
    maxAge: 30 * 86400,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(DEV_COOKIE);
}
