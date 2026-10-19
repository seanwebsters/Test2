import "server-only";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import opentype from "opentype.js";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { newId, nowIso } from "@/lib/util";
import type { ArtworkAsset, ArtworkKind } from "@/lib/types";
import { GeminiError, nanoBananaImage, type AspectRatio } from "@/lib/providers/nano-banana";
import { falNanoBanana } from "@/lib/providers/fal";
import { BlockedError, RateLimitedError, StepFailure } from "./errors";
import { getStudioSettings } from "./settings";
import type { CallMeta } from "./llm";

/** Generate one image with Nano Banana and store the original plus delivery renditions. */
export async function generateArtwork(input: {
  meta: CallMeta;
  seriesId: string;
  episodeId?: string | null;
  characterId?: string | null;
  kind: ArtworkKind;
  prompt: string;
  aspectRatio: AspectRatio;
  references?: { mimeType: string; data: Buffer; label?: string }[];
}): Promise<{ asset: ArtworkAsset; cost_cents: number }> {
  if (!env.geminiApiKey && !env.falKey) throw new BlockedError("GEMINI_API_KEY", "Connect a Gemini API key (or a fal.ai FAL_KEY) so the Art Director can create artwork with Nano Banana.");
  const settings = await getStudioSettings();
  const viaFal = !env.geminiApiKey;
  const keyName = viaFal ? "FAL_KEY" : "GEMINI_API_KEY";
  let img;
  try {
    img = viaFal
      ? await falNanoBanana(env.falKey!, { prompt: input.prompt, endpoint: settings.fal_image_endpoint, aspectRatio: input.aspectRatio, references: input.references })
      : await nanoBananaImage(env.geminiApiKey!, {
          prompt: input.prompt,
          model: settings.image_model,
          aspectRatio: input.aspectRatio,
          imageSize: settings.image_size || undefined,
          references: input.references,
        });
  } catch (err) {
    if (err instanceof GeminiError) {
      if (err.status === 401 || err.status === 403) throw new BlockedError(keyName, `${viaFal ? "fal.ai" : "Gemini"} rejected the API key (${err.status}). Check ${keyName}.`);
      if (err.status === 429) throw new RateLimitedError(viaFal ? "fal.ai" : "Gemini", err.retryAfterMs ?? 30_000);
      if (err.status >= 500) throw new StepFailure(err.message, true);
      throw new StepFailure(err.message, err.status === 502);
    }
    throw err;
  }
  const model = viaFal ? settings.fal_image_endpoint : settings.image_model;
  const asset = await storeArtwork({ ...input, data: img.data, mimeType: img.mimeType, provider: viaFal ? "fal" : "gemini", model });
  await getDb().insert("usage_records", {
    id: newId("use"),
    run_id: input.meta.runId,
    step_id: input.meta.stepId,
    series_id: input.seriesId,
    agent: "art_director",
    provider: "gemini",
    operation: `image:${input.kind}`,
    model,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    characters: 0,
    seconds: 0,
    images: 1,
    cost_cents: img.cost_cents,
    created_at: nowIso(),
  });
  return { asset, cost_cents: img.cost_cents };
}

const RENDITIONS = [1200, 600, 300];

export async function storeArtwork(input: {
  meta: CallMeta;
  seriesId: string;
  episodeId?: string | null;
  characterId?: string | null;
  kind: ArtworkKind;
  prompt: string;
  data: Buffer;
  mimeType: string;
  provider: string;
  model: string;
}): Promise<ArtworkAsset> {
  const storage = getStorage();
  const id = newId("art");
  // Keep storage small: providers return multi-megabyte PNGs; a high-quality JPEG is a fraction of the size.
  try {
    input = { ...input, data: await sharp(input.data).jpeg({ quality: 90, mozjpeg: true }).toBuffer(), mimeType: "image/jpeg" };
  } catch {
    // Not decodable by sharp; store as received.
  }
  const ext = input.mimeType.includes("jpeg") ? "jpg" : input.mimeType.includes("webp") ? "webp" : "png";
  const key = `art/${input.seriesId}/${id}/original.${ext}`;
  await storage.put(key, input.data, input.mimeType);
  let width: number | null = null;
  let height: number | null = null;
  const variants: Record<string, string> = {};
  try {
    const meta = await sharp(input.data).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
    for (const w of RENDITIONS) {
      if (width && w >= width) continue;
      const buf = await sharp(input.data).resize({ width: w }).webp({ quality: 84 }).toBuffer();
      await storage.put(`art/${input.seriesId}/${id}/${w}w.webp`, buf, "image/webp");
      variants[`${w}w`] = `/api/art/${id}?v=${w}w`;
    }
  } catch {
    // Not decodable by sharp (unusual); keep the original only.
  }
  return getDb().insert("artwork_assets", {
    id,
    series_id: input.seriesId,
    episode_id: input.episodeId ?? null,
    character_id: input.characterId ?? null,
    run_id: input.meta.runId,
    kind: input.kind,
    status: "concept",
    storage_key: key,
    url: `/api/art/${id}`,
    mime_type: input.mimeType,
    width,
    height,
    variants,
    provider: input.provider,
    model: input.model,
    prompt: input.prompt,
    review: null,
    created_at: nowIso(),
  });
}

export async function loadArtwork(asset: ArtworkAsset, variant?: string): Promise<{ data: Buffer; mimeType: string } | null> {
  const storage = getStorage();
  if (variant && asset.variants[variant]) {
    if (variant === "titled") {
      const jpg = await storage.get(`art/${asset.series_id}/${asset.id}/titled.jpg`);
      if (jpg) return { data: jpg.data, mimeType: "image/jpeg" };
      const png = await storage.get(`art/${asset.series_id}/${asset.id}/titled.png`); // older assets
      if (png) return { data: png.data, mimeType: "image/png" };
    } else {
      const f = await storage.get(`art/${asset.series_id}/${asset.id}/${variant}.webp`);
      if (f) return { data: f.data, mimeType: "image/webp" };
    }
  }
  const f = await storage.get(asset.storage_key);
  return f ? { data: f.data, mimeType: asset.mime_type } : null;
}

/** Smaller copy for model review / reference (keeps requests light). */
export async function artworkForReview(asset: ArtworkAsset, width = 1024): Promise<{ mimeType: string; data: Buffer } | null> {
  const f = await loadArtwork(asset);
  if (!f) return null;
  try {
    return { mimeType: "image/jpeg", data: await sharp(f.data).resize({ width, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer() };
  } catch {
    return f;
  }
}

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

const fontCache = new Map<string, opentype.Font>();
function font(weight: "600" | "400", style: "normal" | "italic"): opentype.Font {
  const file = `cormorant-garamond-latin-${weight}-${style}.woff`;
  const cached = fontCache.get(file);
  if (cached) return cached;
  const p = path.join(process.cwd(), "node_modules", "@fontsource", "cormorant-garamond", "files", file);
  const buf = fs.readFileSync(p);
  const f = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  fontCache.set(file, f);
  return f;
}

function textPath(f: opentype.Font, text: string, size: number, cx: number, y: number, maxWidth: number): string {
  let s = size;
  let width = f.getAdvanceWidth(text, s);
  if (width > maxWidth) {
    s = (s * maxWidth) / width;
    width = maxWidth;
  }
  return f.getPath(text, cx - width / 2, y, s).toPathData(2);
}

/**
 * Apply the series title (and an optional line such as "Episode 3") as clean
 * vector typography over generated art – generated images never contain text.
 */
export async function applyTitle(asset: ArtworkAsset, lines: { title: string; kicker?: string; footer?: string; color?: string }): Promise<ArtworkAsset> {
  const src = await loadArtwork(asset);
  if (!src) throw new StepFailure("Artwork file missing.");
  const img = sharp(src.data);
  const meta = await img.metadata();
  const W = meta.width ?? 1024;
  const H = meta.height ?? 1536;
  const color = lines.color ?? "#f6efe2";
  const portrait = H > W;
  const titleY = portrait ? H * 0.16 : H * 0.2;
  const titleSize = Math.round(W * (portrait ? 0.105 : 0.075));
  const parts: string[] = [];
  if (lines.kicker) parts.push(`<path d="${textPath(font("400", "italic"), lines.kicker, titleSize * 0.36, W / 2, titleY - titleSize * 0.95, W * 0.8)}" fill="${color}" fill-opacity="0.85"/>`);
  const words = lines.title.split(" ");
  // Two lines for long titles.
  const split = lines.title.length > 22 ? Math.ceil(words.length / 2) : words.length;
  const l1 = words.slice(0, split).join(" ");
  const l2 = words.slice(split).join(" ");
  parts.push(`<path d="${textPath(font("600", "normal"), l1, titleSize, W / 2, titleY, W * 0.86)}" fill="${color}"/>`);
  if (l2) parts.push(`<path d="${textPath(font("600", "normal"), l2, titleSize, W / 2, titleY + titleSize * 1.02, W * 0.86)}" fill="${color}"/>`);
  if (lines.footer) parts.push(`<path d="${textPath(font("400", "italic"), lines.footer, titleSize * 0.32, W / 2, H * 0.94, W * 0.8)}" fill="${color}" fill-opacity="0.85"/>`);
  const shade = `<defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.38" stop-color="#000" stop-opacity="0"/><stop offset="0.85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#t)"/>`;
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${shade}${parts.join("")}</svg>`);
  const out = await img.composite([{ input: svg, top: 0, left: 0 }]).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  await getStorage().put(`art/${asset.series_id}/${asset.id}/titled.jpg`, out, "image/jpeg");
  return getDb().update("artwork_assets", asset.id, { variants: { ...asset.variants, titled: `/api/art/${asset.id}?v=titled` } });
}
