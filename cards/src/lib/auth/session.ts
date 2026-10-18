import "server-only";
import { cookies } from "next/headers";
import { now } from "@/lib/clock";
import { getStore } from "@/lib/db";
import type { User } from "@/lib/db/types";
import { ServiceError } from "@/lib/services/core";
import { ensureGuestTx } from "@/lib/services/users";
import { SESSION_COOKIE, signToken, verifyToken } from "./token";

export async function sessionUserId(): Promise<string | undefined> {
  const jar = await cookies();
  return verifyToken(jar.get(SESSION_COOKIE)?.value);
}

/** The current collector, creating the guest record on first visit. */
export async function currentUser(): Promise<User | undefined> {
  const id = await sessionUserId();
  if (!id) return undefined;
  const store = getStore();
  const existing = store.read().users[id];
  if (existing && Date.now() - Date.parse(existing.lastSeenAt) < 3600_000) return existing;
  if (existing?.isDemo) return existing;
  return store.transact((d) => ensureGuestTx(d, id, now()));
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) throw new ServiceError("unauthenticated", "No session", 401);
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await currentUser();
  if (!u || u.role !== "admin") throw new ServiceError("forbidden", "Studio access requires an administrator account", 403);
  return u;
}

export async function setSessionUser(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signToken(userId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 400 });
}
