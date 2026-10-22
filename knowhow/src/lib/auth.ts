import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, TZ_COOKIE, verifySession } from "./session";
import { loadOrCreateUser } from "./store";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function sessionUserId(): Promise<string> {
  const jar = await cookies();
  const id = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!id) throw new HttpError(401, "No session");
  return id;
}

export async function currentUser() {
  return loadOrCreateUser(await sessionUserId());
}

/** The listener's local calendar day, from the kh_tz cookie the client sets. */
export async function todayKey(now = new Date()): Promise<string> {
  const jar = await cookies();
  return dayKey(now, jar.get(TZ_COOKIE)?.value);
}

export function dayKey(now: Date, tz?: string): string {
  let zone = "UTC";
  if (tz) {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: tz });
      zone = tz;
    } catch {
      /* invalid zone → UTC */
    }
  }
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function hourIn(now: Date, tz?: string): number {
  try {
    return Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz || "UTC", hour: "2-digit", hourCycle: "h23" }).format(now));
  } catch {
    return now.getUTCHours();
  }
}
