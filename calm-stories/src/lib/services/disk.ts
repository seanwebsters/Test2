import "server-only";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { log } from "@/lib/log";
import { runFfmpeg, withTmp } from "@/lib/studio/mixing";

const storageRoot = () => path.resolve(process.cwd(), env.dataDir, "storage");

export interface DiskUsage {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  byFolder: Record<string, number>;
}

/** Real disk usage of the data directory (the Railway volume), plus what each storage folder takes. */
export function diskUsage(opts: { breakdown?: boolean } = {}): DiskUsage | null {
  if (env.storageBackend !== "local") return null;
  try {
    fs.mkdirSync(env.dataDir, { recursive: true });
    const s = fs.statfsSync(env.dataDir);
    const total = s.blocks * s.bsize;
    const free = s.bavail * s.bsize;
    const byFolder: Record<string, number> = {};
    if (opts.breakdown) for (const f of walk(storageRoot())) byFolder[f.key.split("/")[0]!] = (byFolder[f.key.split("/")[0]!] ?? 0) + f.size;
    return { totalBytes: total, freeBytes: free, usedBytes: total - free, byFolder };
  } catch {
    return null;
  }
}

function* walk(root: string, dir = root): Generator<{ key: string; full: string; size: number; mtimeMs: number }> {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(root, full);
    else {
      const st = fs.statSync(full);
      yield { key: path.relative(root, full).split(path.sep).join("/"), full, size: st.size, mtimeMs: st.mtimeMs };
    }
  }
}

/**
 * Free space on the volume without losing anything in use:
 * 1. delete files nothing refers to any more (older than two hours, so work in progress is safe);
 * 2. convert older WAV narration/stems to MP3 and older PNG artwork to JPEG, updating the records.
 */
export async function freeUpSpace(): Promise<{ deleted: number; converted: number; freedBytes: number }> {
  if (env.storageBackend !== "local") return { deleted: 0, converted: 0, freedBytes: 0 };
  const db = getDb();
  const storage = getStorage();
  const before = diskUsage()?.freeBytes ?? 0;
  const refs = JSON.stringify(await Promise.all([db.list("scene_renders"), db.list("audio_assets"), db.list("artwork_assets"), db.list("voice_auditions"), db.list("episodes"), db.list("series"), db.list("characters")]));
  let deleted = 0;
  const cutoff = Date.now() - 2 * 3600_000;
  for (const f of [...walk(storageRoot())]) {
    if (f.mtimeMs > cutoff || f.key.startsWith("avatars/")) continue;
    const artId = f.key.startsWith("art/") ? f.key.split("/")[2] : null;
    const used = refs.includes(f.key) || (artId && refs.includes(artId));
    if (!used) {
      fs.rmSync(f.full, { force: true });
      deleted++;
    }
  }
  let converted = 0;
  for (const r of await db.list("scene_renders")) {
    const patch: { narration_key?: string; stem_key?: string } = {};
    for (const field of ["narration_key", "stem_key"] as const) {
      const k = r[field];
      if (!k?.endsWith(".wav")) continue;
      const file = await storage.get(k);
      if (!file) continue;
      const mp3Key = k.replace(/\.wav$/, ".mp3");
      await withTmp(async (dir) => {
        const src = path.join(dir, "in.wav");
        const out = path.join(dir, "out.mp3");
        fs.writeFileSync(src, file.data);
        await runFfmpeg(["-i", src, "-c:a", "libmp3lame", "-b:a", "192k", out]);
        await storage.put(mp3Key, fs.readFileSync(out), "audio/mpeg");
      });
      patch[field] = mp3Key;
    }
    if (Object.keys(patch).length) {
      await db.update("scene_renders", r.id, patch);
      for (const field of Object.keys(patch) as ("narration_key" | "stem_key")[]) await storage.remove(r[field]!);
      converted += Object.keys(patch).length;
    }
  }
  for (const a of await db.list("artwork_assets")) {
    if (!a.storage_key.endsWith(".png")) continue;
    const file = await storage.get(a.storage_key);
    if (!file) continue;
    try {
      const jpgKey = a.storage_key.replace(/\.png$/, ".jpg");
      await storage.put(jpgKey, await sharp(file.data).jpeg({ quality: 90, mozjpeg: true }).toBuffer(), "image/jpeg");
      await db.update("artwork_assets", a.id, { storage_key: jpgKey, mime_type: "image/jpeg" });
      await storage.remove(a.storage_key);
      converted++;
    } catch {
      /* leave undecodable files as they are */
    }
    const titledPng = `art/${a.series_id}/${a.id}/titled.png`;
    const titled = await storage.get(titledPng);
    if (titled) {
      await storage.put(titledPng.replace(/\.png$/, ".jpg"), await sharp(titled.data).jpeg({ quality: 90, mozjpeg: true }).toBuffer(), "image/jpeg");
      await storage.remove(titledPng);
      converted++;
    }
  }
  const freedBytes = Math.max(0, (diskUsage()?.freeBytes ?? 0) - before);
  log.info("storage", "freed space", { deleted, converted, freedBytes });
  return { deleted, converted, freedBytes };
}
