import "server-only";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { getDb } from "@/lib/db";
import { log } from "@/lib/log";
import { newId, nowIso } from "@/lib/util";

/**
 * Image generation integration point. With OPENAI_API_KEY and the image
 * provider set to auto/openai, key art is generated with OpenAI Images;
 * otherwise callers fall back to procedural artwork (clearly labelled).
 */
export function imageProviderStatus(): { configured: boolean; provider: string } {
  return env.openaiApiKey ? { configured: true, provider: "openai-images" } : { configured: false, provider: "procedural" };
}

export async function generateImage(input: { prompt: string; seriesId: string }): Promise<{ url: string; provider: string } | null> {
  const settings = await getDb().get("ai_settings", "global");
  if (settings?.image_provider === "procedural" || !env.openaiApiKey) return null;
  try {
    const client = new OpenAI({ apiKey: env.openaiApiKey });
    const res = await client.images.generate({ model: "gpt-image-1", prompt: input.prompt, size: "1536x1024", n: 1 });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) return null;
    const key = `art/${input.seriesId}/${newId("img")}.png`;
    await getStorage().put(key, Buffer.from(b64, "base64"), "image/png");
    await getDb().insert("production_costs", {
      id: newId("cost"),
      job_id: null,
      series_id: input.seriesId,
      episode_id: null,
      category: "image",
      provider: "openai",
      model: "gpt-image-1",
      units: 1,
      unit_label: "image",
      cost_cents: 19,
      simulated: false,
      created_at: nowIso(),
    });
    return { url: `/api/media/${key}`, provider: "openai-images" };
  } catch (err) {
    log.warn("images", "Image generation failed; using procedural art", { error: String(err) });
    return null;
  }
}
