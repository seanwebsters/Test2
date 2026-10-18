import { randomUUID } from "node:crypto";
import type { DbState, Notification, OwnedCard, User, Wallet } from "@/lib/db/types";

export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

export const iso = (ms: number) => new Date(ms).toISOString();

const MAX_EVENTS = 20_000;

export function requireUser(draft: DbState, userId: string): User {
  const u = draft.users[userId];
  if (!u) throw new ServiceError("no_user", "Unknown collector", 401);
  return u;
}

/** Defence in depth: Studio mutations re-check the actor's role inside the transaction. */
export function requireAdminUser(draft: DbState, userId: string): User {
  const u = draft.users[userId];
  if (!u || u.role !== "admin") throw new ServiceError("forbidden", "Administrator access required", 403);
  return u;
}

export function wallet(draft: DbState, userId: string): Wallet {
  return (draft.wallets[userId] ??= { shards: 0, stardust: 0, tokens: {} });
}

export function inventoryOf(state: DbState, userId: string): Record<string, OwnedCard> {
  return state.inventory[userId] ?? {};
}

export function credit(draft: DbState, userId: string, currency: "shards" | "stardust", amount: number, reason: string, at: number, ref?: string) {
  if (amount === 0) return;
  const w = wallet(draft, userId);
  if (w[currency] + amount < 0) throw new ServiceError("insufficient_funds", `Not enough ${currency === "shards" ? "Shards" : "Stardust"}`, 402);
  w[currency] += amount;
  draft.transactions.push({ id: newId("tx"), userId, currency, amount, reason, ref, at: iso(at) });
}

export function track(
  draft: DbState,
  name: string,
  at: number,
  data: { userId?: string; universeId?: string; props?: Record<string, string | number | boolean> } = {},
) {
  draft.events.push({ id: newId("ev"), name, at: iso(at), ...data });
  if (draft.events.length > MAX_EVENTS) draft.events.splice(0, draft.events.length - MAX_EVENTS);
}

export function notify(draft: DbState, n: Omit<Notification, "id" | "createdAt"> & { createdAt?: string }, at: number) {
  if (draft.notifications.some((x) => x.userId === n.userId && x.key === n.key)) return;
  draft.notifications.push({ id: newId("nt"), createdAt: n.createdAt ?? iso(at), ...n });
}

export function audit(draft: DbState, actorId: string, action: string, at: number, target?: string, detail?: string) {
  draft.audit.push({ id: newId("au"), actorId, action, target, detail, at: iso(at) });
}
