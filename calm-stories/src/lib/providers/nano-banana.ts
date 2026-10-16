import "server-only";

/**
 * "Nano Banana" – Gemini image generation via the Gemini API
 * (generateContent with an IMAGE response modality).
 */
export type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9";

interface InlineData {
  mimeType?: string;
  mime_type?: string;
  data: string;
}

export async function nanoBananaImage(
  apiKey: string,
  input: { prompt: string; model: string; aspectRatio: AspectRatio },
): Promise<{ data: Buffer; mimeType: string; cost_cents: number }> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: input.aspectRatio } },
    }),
  });
  if (!res.ok) throw new Error(`Gemini image error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: InlineData; inline_data?: InlineData; text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (json.promptFeedback?.blockReason) throw new Error(`Image prompt was blocked (${json.promptFeedback.blockReason}).`);
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const img = parts.map((p) => p.inlineData ?? p.inline_data).find((d): d is InlineData => Boolean(d?.data));
  if (!img) throw new Error(`Gemini returned no image (${json.candidates?.[0]?.finishReason ?? "no candidates"}).`);
  // ≈ $0.039 per image at list price; tracked as an estimate.
  return { data: Buffer.from(img.data, "base64"), mimeType: img.mimeType ?? img.mime_type ?? "image/png", cost_cents: 3.9 };
}
