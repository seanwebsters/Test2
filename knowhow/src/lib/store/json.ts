import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { AiJobRecord, AiSeriesRecord, CollectionRecord, UserRecord } from "../model";
import type { Store } from "./types";

/**
 * Demo store: JSON files under DATA_DIR (default ./.data). Survives restarts on
 * a normal server or a mounted volume. On serverless hosts use Supabase.
 */
const DIR = process.env.DATA_DIR || (process.env.VERCEL ? "/tmp/knowhow-data" : path.join(process.cwd(), ".data"));

const safe = (id: string) => {
  if (!/^[a-zA-Z0-9_.-]{1,120}$/.test(id)) throw new Error("Invalid id");
  return id;
};

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, file), "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

async function writeJson(file: string, data: unknown) {
  const full = path.join(DIR, file);
  await fs.mkdir(path.dirname(full), { recursive: true });
  const tmp = `${full}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data));
  await fs.rename(tmp, full);
}

let indexLock: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = indexLock.then(fn, fn);
  indexLock = run.catch(() => undefined);
  return run;
}

type Index = { handles: Record<string, string>; stripe: Record<string, string> };

export const jsonStore: Store = {
  kind: "json",
  getUser: (id) => readJson<UserRecord>(`users/${safe(id)}.json`),
  async saveUser(user, previous) {
    await writeJson(`users/${safe(user.id)}.json`, user);
    const handleChanged = previous?.handle !== user.handle;
    const stripeChanged = previous?.subscription.stripeCustomerId !== user.subscription.stripeCustomerId;
    if (handleChanged || stripeChanged) {
      await serial(async () => {
        const idx = (await readJson<Index>("index.json")) ?? { handles: {}, stripe: {} };
        if (previous?.handle && idx.handles[previous.handle] === user.id) delete idx.handles[previous.handle];
        idx.handles[user.handle] = user.id;
        if (user.subscription.stripeCustomerId) idx.stripe[user.subscription.stripeCustomerId] = user.id;
        await writeJson("index.json", idx);
      });
    }
  },
  async findUserByHandle(handle) {
    const idx = await readJson<Index>("index.json");
    const id = idx?.handles[handle.toLowerCase()];
    return id ? this.getUser(id) : null;
  },
  async findUserByStripeCustomer(customerId) {
    const idx = await readJson<Index>("index.json");
    const id = idx?.stripe[customerId];
    return id ? this.getUser(id) : null;
  },
  async listCollections() {
    return (await readJson<CollectionRecord[]>("collections.json")) ?? [];
  },
  async getCollection(id) {
    return (await this.listCollections()).find((c) => c.id === id) ?? null;
  },
  saveCollection: (c) =>
    serial(async () => {
      const all = (await readJson<CollectionRecord[]>("collections.json")) ?? [];
      const i = all.findIndex((x) => x.id === c.id);
      if (i >= 0) all[i] = c;
      else all.push(c);
      await writeJson("collections.json", all);
    }),
  deleteCollection: (id) =>
    serial(async () => {
      const all = (await readJson<CollectionRecord[]>("collections.json")) ?? [];
      await writeJson("collections.json", all.filter((c) => c.id !== id));
    }),
  getAiSeries: (id) => readJson<AiSeriesRecord>(`ai-series/${safe(id)}.json`),
  saveAiSeries: (s) => writeJson(`ai-series/${safe(s.id)}.json`, s),
  getJob: (id) => readJson<AiJobRecord>(`jobs/${safe(id)}.json`),
  saveJob: (j) => writeJson(`jobs/${safe(j.id)}.json`, j),
  async putAudio(key, data) {
    const full = path.join(DIR, "audio", safe(key));
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  },
  async getAudio(key) {
    try {
      return await fs.readFile(path.join(DIR, "audio", safe(key)));
    } catch {
      return null;
    }
  },
};
