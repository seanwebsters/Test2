import "server-only";

/**
 * "Nano Banana" – Gemini native image generation via the Gemini API
 * (generateContent with an IMAGE response modality). Reference images are
 * sent as inline image parts so characters stay consistent across artwork.
 */
export type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9";

interface InlineData {
  mimeType?: string;
  mime_type?: string;
  data: string;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
  }
}

export async function nanoBananaImage(
  apiKey: string,
  input: { prompt: string; model: string; aspectRatio: AspectRatio; imageSize?: string; references?: { mimeType: string; data: Buffer; label?: string }[] },
): Promise<{ data: Buffer; mimeType: string; cost_cents: number }> {
  const parts: Record<string, unknown>[] = [];
  for (const ref of input.references ?? []) {
    if (ref.label) parts.push({ text: `Reference – ${ref.label}:` });
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data.toString("base64") } });
  }
  parts.push({ text: input.prompt });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: input.aspectRatio, ...(input.imageSize ? { imageSize: input.imageSize } : {}) },
      },
    }),
  });
  if (!res.ok) {
    const retry = Number(res.headers.get("retry-after"));
    throw new GeminiError(`Gemini image error ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status, Number.isFinite(retry) && retry > 0 ? retry * 1000 : null);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: InlineData; inline_data?: InlineData; text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (json.promptFeedback?.blockReason) throw new GeminiError(`Image prompt was blocked (${json.promptFeedback.blockReason}).`, 400);
  const out = json.candidates?.[0]?.content?.parts ?? [];
  const img = out.map((p) => p.inlineData ?? p.inline_data).find((d): d is InlineData => Boolean(d?.data));
  if (!img) throw new GeminiError(`Gemini returned no image (${json.candidates?.[0]?.finishReason ?? "no candidates"}).`, 502);
  // ≈ $0.039 per 1K image at list price; tracked as an estimate.
  return { data: Buffer.from(img.data, "base64"), mimeType: img.mimeType ?? img.mime_type ?? "image/png", cost_cents: 3.9 };
}
