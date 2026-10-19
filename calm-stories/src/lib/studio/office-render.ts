import "server-only";
import sharp from "sharp";
import { env } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { nowIso } from "@/lib/util";
import { falNanoBanana } from "@/lib/providers/fal";
import { getStudioSettings } from "./settings";

const KEY = "office/render.jpg";
const META = "office/render.json";

const PROMPT = [
  "Turn this isometric illustration of an empty office into a photorealistic architectural 3D render.",
  "Keep EXACTLY the same isometric camera angle, framing, room shape, layout, and the position, size and orientation of every object – do not move, add or remove anything, and do not add any people.",
  "Materials: matte white stone floor tiles, light natural oak plank floor in the lounge, white desks with thin legs, silver MacBook laptops, black ergonomic office chairs, light grey fabric sofas, white planters with lush real indoor trees and plants, frameless glass partitions, white walls with tall windows and soft daylight.",
  "Soft natural daylight streaming through the windows, gentle realistic shadows and ambient occlusion, calm, airy, premium modern office like Apple Park. Keep the dark navy background outside the room. Photorealistic, high detail, no text, no logos, no people.",
].join(" ");

export async function officeRender(): Promise<{ data: Buffer; updated_at: string } | null> {
  const f = await getStorage().get(KEY);
  if (!f) return null;
  const meta = await getStorage().get(META);
  const updated_at = meta ? (JSON.parse(meta.data.toString()) as { updated_at: string }).updated_at : "";
  return { data: f.data, updated_at };
}

export async function officeRenderInfo(): Promise<{ updated_at: string } | null> {
  const meta = await getStorage().get(META);
  return meta ? (JSON.parse(meta.data.toString()) as { updated_at: string }) : null;
}

/** Render the empty office (a PNG snapshot of the illustration) as a photoreal image with Nano Banana on fal. */
export async function makeOfficeRender(snapshot: Buffer): Promise<{ updated_at: string }> {
  if (!env.falKey) throw new Error("Connect a FAL_KEY in Railway to make the photoreal office.");
  const ref = await sharp(snapshot).flatten({ background: "#0a1026" }).png().toBuffer(); // validates it's an image
  const settings = await getStudioSettings();
  const img = await falNanoBanana(env.falKey, { prompt: PROMPT, endpoint: settings.fal_image_endpoint, aspectRatio: "16:9", references: [{ mimeType: "image/png", data: ref }] });
  const jpg = await sharp(img.data).resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const updated_at = nowIso();
  await getStorage().put(KEY, jpg, "image/jpeg");
  await getStorage().put(META, Buffer.from(JSON.stringify({ updated_at, cost_cents: img.cost_cents })), "application/json");
  return { updated_at };
}

export async function clearOfficeRender(): Promise<void> {
  await getStorage().remove(KEY);
  await getStorage().remove(META);
}
