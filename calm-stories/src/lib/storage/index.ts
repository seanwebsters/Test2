import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export interface StoredObject {
  bytes: Uint8Array;
  contentType: string;
}

/**
 * Blob storage for audio and artwork.
 * - local: files under DATA_DIR/blobs (development, tests)
 * - r2: Cloudflare R2 via the S3-compatible API (production audio)
 * - supabase: Supabase Storage bucket (prototype assets)
 */
export interface BlobStore {
  readonly name: "local" | "r2" | "supabase";
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  exists(key: string): Promise<boolean>;
  /** A direct public URL if the backend serves objects itself, else null (stream via our API). */
  publicUrl(key: string): string | null;
}

function safeKey(key: string) {
  if (key.includes("..") || path.isAbsolute(key)) throw new Error("Invalid storage key");
  return key;
}

export class LocalBlobStore implements BlobStore {
  readonly name = "local" as const;
  constructor(private readonly root: string) {}
  private file(key: string) {
    return path.join(this.root, safeKey(key));
  }
  async put(key: string, bytes: Uint8Array, contentType: string) {
    const f = this.file(key);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, bytes);
    await fs.writeFile(`${f}.meta.json`, JSON.stringify({ contentType }));
  }
  async get(key: string) {
    try {
      const f = this.file(key);
      const [bytes, meta] = await Promise.all([fs.readFile(f), fs.readFile(`${f}.meta.json`, "utf8").catch(() => "{}")]);
      const contentType = (JSON.parse(meta) as { contentType?: string }).contentType ?? "application/octet-stream";
      return { bytes: new Uint8Array(bytes), contentType };
    } catch {
      return null;
    }
  }
  async exists(key: string) {
    try {
      await fs.access(this.file(key));
      return true;
    } catch {
      return false;
    }
  }
  publicUrl() {
    return null;
  }
}

export class R2BlobStore implements BlobStore {
  readonly name = "r2" as const;
  private client: AwsClient;
  private endpoint: string;
  constructor(accountId: string, accessKeyId: string, secretAccessKey: string, private readonly bucket: string, private readonly publicBase?: string) {
    this.client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
    this.endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}`;
  }
  async put(key: string, bytes: Uint8Array, contentType: string) {
    const res = await this.client.fetch(`${this.endpoint}/${safeKey(key)}`, { method: "PUT", body: Buffer.from(bytes), headers: { "content-type": contentType } });
    if (!res.ok) throw new Error(`R2 put failed: ${res.status}`);
  }
  async get(key: string) {
    const res = await this.client.fetch(`${this.endpoint}/${safeKey(key)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`R2 get failed: ${res.status}`);
    return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
  }
  async exists(key: string) {
    const res = await this.client.fetch(`${this.endpoint}/${safeKey(key)}`, { method: "HEAD" });
    return res.ok;
  }
  publicUrl(key: string) {
    return this.publicBase ? `${this.publicBase.replace(/\/$/, "")}/${key}` : null;
  }
}

export class SupabaseBlobStore implements BlobStore {
  readonly name = "supabase" as const;
  private client;
  constructor(url: string, serviceKey: string, private readonly bucket: string) {
    this.client = createClient(url, serviceKey, { auth: { persistSession: false } });
  }
  async put(key: string, bytes: Uint8Array, contentType: string) {
    const { error } = await this.client.storage.from(this.bucket).upload(safeKey(key), bytes, { contentType, upsert: true });
    if (error) throw new Error(`Supabase storage put failed: ${error.message}`);
  }
  async get(key: string) {
    const { data, error } = await this.client.storage.from(this.bucket).download(safeKey(key));
    if (error || !data) return null;
    return { bytes: new Uint8Array(await data.arrayBuffer()), contentType: data.type || "application/octet-stream" };
  }
  async exists(key: string) {
    return (await this.get(key)) !== null;
  }
  publicUrl() {
    // Private bucket: objects are streamed through the entitlement-checked API.
    return null;
  }
}

const g = globalThis as unknown as { __calmStore?: BlobStore };

export function getStore(): BlobStore {
  if (g.__calmStore) return g.__calmStore;
  if (env.storageBackend === "r2") {
    if (!env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey || !env.r2Bucket) {
      throw new Error("STORAGE_BACKEND=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.");
    }
    g.__calmStore = new R2BlobStore(env.r2AccountId, env.r2AccessKeyId, env.r2SecretAccessKey, env.r2Bucket, env.r2PublicBaseUrl);
  } else if (env.storageBackend === "supabase") {
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) throw new Error("STORAGE_BACKEND=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    g.__calmStore = new SupabaseBlobStore(env.supabaseUrl, env.supabaseServiceRoleKey, env.supabaseStorageBucket);
  } else {
    g.__calmStore = new LocalBlobStore(path.resolve(process.cwd(), env.dataDir, "blobs"));
  }
  return g.__calmStore;
}

export function setStore(store: BlobStore | undefined) {
  g.__calmStore = store;
}
