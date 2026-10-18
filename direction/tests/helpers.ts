import { vi } from "vitest";
import { setLocalStore } from "@/lib/server/context";
import { LocalStore } from "@/lib/server/store/local";
import type { Viewer } from "@/lib/server/context";
import { emptyAnswers } from "@/lib/engine/matching";
import type { OnboardingAnswers } from "@/lib/engine/model";

/** A fake cookie jar standing in for next/headers in route-handler tests. */
export const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

export function freshStore(): LocalStore {
  const s = LocalStore.inMemory();
  setLocalStore(s);
  return s;
}

let n = 0;
export function viewer(id?: string): Viewer {
  return { userId: id ?? `user-${++n}-${Math.random().toString(36).slice(2, 8)}`, email: null, accessToken: null };
}

export function creativeAnswers(patch: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  return {
    ...emptyAnswers(),
    name: "Alex",
    status: "university",
    swipes: { "festival-poster": "love", "music-video": "yes", "app-bug": "no" },
    thisOrThat: { "make-fix": "a", "help-lead": "b" },
    interests: ["art", "design", "film"],
    subjects: ["art"],
    lifestyle: "studio",
    values: { money: 1, creativity: 5, stability: 1, flexibility: 2, impact: 1 },
    skills: ["visual-design"],
    ...patch,
  };
}

export function req(url: string, body?: unknown, method?: string): Request {
  return new Request(`http://localhost${url}`, {
    method: method ?? (body ? "POST" : "GET"),
    headers: body ? { "content-type": "application/json", origin: "http://localhost", host: "localhost" } : { host: "localhost" },
    body: body ? JSON.stringify(body) : undefined,
  });
}
