import "server-only";
import fs from "node:fs";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Object storage for generated audio and uploaded artwork.
 *  - local:    .data/storage (development)
 *  - r2:       Cloudflare R2 via the S3 API (production audio)
 *  - supabase: Supabase Storage (prototype assets)
 */
export interface StorageProvider {
  readonly name: "local" | "r2" | "supabase";
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string, range?: { start: number; end?: number }): Promise<{ data: Buffer; size: number } | null>;
  remove(key: string): Promise<void>;
}

class LocalStorage implements StorageProvider {
  readonly name = "local" as const;
  private root = path.resolve(process.cwd(), env.dataDir, "storage");
  private resolve(key: string) {
    const p = path.resolve(this.root, key);
    if (!p.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return p;
  }
  async put(key: string, data: Buffer) {
    const p = this.resolve(key);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, data);
  }
  async get(key: string, range?: { start: number; end?: number }) {
    const p = this.resolve(key);
    if (!fs.existsSync(p)) return null;
    const size = fs.statSync(p).size;
    if (!range) return { data: fs.readFileSync(p), size };
    const end = Math.min(range.end ?? size - 1, size - 1);
    const fd = fs.openSync(p, "r");
    const buf = Buffer.alloc(Math.max(0, end - range.start + 1));
    fs.readSync(fd, buf, 0, buf.length, range.start);
    fs.closeSync(fd);
    return { data: buf, size };
  }
  async remove(key: string) {
    const p = this.resolve(key);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

class R2Storage implements StorageProvider {
  readonly name = "r2" as const;
  private client: AwsClient;
  private base: string;
  constructor() {
    if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey || !env.r2Bucket) {
      throw new Error("STORAGE_BACKEND=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.");
    }
    this.client = new AwsClient({ accessKeyId: env.r2AccessKeyId, secretAccessKey: env.r2SecretAccessKey, service: "s3", region: "auto" });
    this.base = `https://${env.r2AccountId}.r2.cloudflarestorage.com/${env.r2Bucket}`;
  }
  async put(key: string, data: Buffer, contentType: string) {
    const res = await this.client.fetch(`${this.base}/${key}`, { method: "PUT", body: new Uint8Array(data), headers: { "content-type": contentType } });
    if (!res.ok) throw new Error(`R2 put failed: ${res.status}`);
  }
  async get(key: string, range?: { start: number; end?: number }) {
    const headers: Record<string, string> = {};
    if (range) headers.range = `bytes=${range.start}-${range.end ?? ""}`;
    const res = await this.client.fetch(`${this.base}/${key}`, { headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`R2 get failed: ${res.status}`);
    const data = Buffer.from(await res.arrayBuffer());
    const total = res.headers.get("content-range")?.split("/")[1];
    return { data, size: total ? Number(total) : data.length };
  }
  async remove(key: string) {
    await this.client.fetch(`${this.base}/${key}`, { method: "DELETE" });
  }
}

class SupabaseStorage implements StorageProvider {
  readonly name = "supabase" as const;
  private bucket = env.supabaseStorageBucket;
  private client = createClient(env.supabaseUrl ?? "", env.supabaseServiceRoleKey ?? "", { auth: { persistSession: false } });
  async put(key: string, data: Buffer, contentType: string) {
    const { error } = await this.client.storage.from(this.bucket).upload(key, data, { contentType, upsert: true });
    if (error) throw new Error(`Supabase storage upload failed: ${error.message}`);
  }
  async get(key: string, range?: { start: number; end?: number }) {
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error || !data) return null;
    const full = Buffer.from(await data.arrayBuffer());
    if (!range) return { data: full, size: full.length };
    return { data: full.subarray(range.start, (range.end ?? full.length - 1) + 1), size: full.length };
  }
  async remove(key: string) {
    await this.client.storage.from(this.bucket).remove([key]);
  }
}

const g = globalThis as unknown as { __calmStorage?: StorageProvider };

export function getStorage(): StorageProvider {
  if (g.__calmStorage) return g.__calmStorage;
  g.__calmStorage =
    env.storageBackend === "r2" ? new R2Storage() : env.storageBackend === "supabase" ? new SupabaseStorage() : new LocalStorage();
  return g.__calmStorage;
}

export function setStorage(s: StorageProvider | undefined) {
  g.__calmStorage = s;
}
