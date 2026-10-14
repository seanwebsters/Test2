import "server-only";
import { getDb } from "@/lib/db";
import { getStore, type StoredObject } from "@/lib/storage";
import { SAMPLE_SECONDS } from "@/lib/seed/build";
import { hashString } from "@/lib/util";
import { toMp3 } from "./ffmpeg";
import { renderAmbience } from "./synth";
import { encodeWav } from "./wav";

const inflight = new Map<string, Promise<StoredObject>>();

/**
 * Returns the sample ambience for a soundscape, synthesising and storing it on
 * first request. These stand in for produced narration in the prototype.
 */
export async function ensureSoundscapeSample(slug: string): Promise<StoredObject | null> {
  const key = `samples/${slug}`;
  const store = getStore();
  const cached = await store.get(key);
  if (cached) return cached;
  const soundscape = await getDb().findOne("soundscapes", { slug });
  if (!soundscape) return null;
  let p = inflight.get(key);
  if (!p) {
    p = (async () => {
      const pcm = renderAmbience(soundscape.layers, { seconds: SAMPLE_SECONDS, seed: hashString(slug) % 100000 });
      const out = await toMp3(encodeWav(pcm));
      await store.put(key, out.bytes, out.contentType);
      return out;
    })().finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}
