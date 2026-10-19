import "server-only";
import { GeminiError, type AspectRatio } from "./nano-banana";

/**
 * Nano Banana via fal.ai. Text-to-image uses `fal-ai/nano-banana`; when
 * reference images are given (character consistency) it uses the `/edit`
 * endpoint with the references as data URIs. Errors reuse GeminiError so the
 * studio handles both image providers the same way.
 */
export async function falNanoBanana(
  apiKey: string,
  input: { prompt: string; endpoint: string; aspectRatio: AspectRatio; references?: { mimeType: string; data: Buffer }[] },
): Promise<{ data: Buffer; mimeType: string; cost_cents: number }> {
  const refs = input.references ?? [];
  const endpoint = refs.length ? `${input.endpoint.replace(/\/edit$/, "")}/edit` : input.endpoint.replace(/\/edit$/, "");
  const res = await fetch(`https://fal.run/${endpoint}`, {
    method: "POST",
    headers: { authorization: `Key ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      prompt: input.prompt,
      num_images: 1,
      aspect_ratio: input.aspectRatio,
      output_format: "png",
      ...(refs.length ? { image_urls: refs.map((r) => `data:${r.mimeType};base64,${r.data.toString("base64")}`) } : {}),
    }),
  });
  if (!res.ok) {
    const retry = Number(res.headers.get("retry-after"));
    throw new GeminiError(`fal.ai error ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status, Number.isFinite(retry) && retry > 0 ? retry * 1000 : null);
  }
  const json = (await res.json()) as { images?: { url: string; content_type?: string }[] };
  const img = json.images?.[0];
  if (!img?.url) throw new GeminiError("fal.ai returned no image.", 502);
  const file = await fetch(img.url);
  if (!file.ok) throw new GeminiError(`Couldn't download the fal.ai image (${file.status}).`, 502);
  // ≈ $0.039 per image at list price; tracked as an estimate.
  return { data: Buffer.from(await file.arrayBuffer()), mimeType: img.content_type ?? file.headers.get("content-type") ?? "image/png", cost_cents: 3.9 };
}

/**
 * Run a slow fal model (e.g. video) through fal's queue: submit, poll until it
 * completes, then fetch the result. Returns the model's JSON output.
 */
export async function falQueue<T = Record<string, unknown>>(apiKey: string, endpoint: string, input: Record<string, unknown>, timeoutMs = 10 * 60_000): Promise<T> {
  const headers = { authorization: `Key ${apiKey}`, "content-type": "application/json" };
  const submit = await fetch(`https://queue.fal.run/${endpoint}`, { method: "POST", headers, body: JSON.stringify(input) });
  if (!submit.ok) throw new GeminiError(`fal.ai error ${submit.status}: ${(await submit.text()).slice(0, 300)}`, submit.status, null);
  const job = (await submit.json()) as { status_url: string; response_url: string };
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, process.env.NODE_ENV === "test" ? 5 : 5000));
    const st = await fetch(job.status_url, { headers });
    if (!st.ok) continue;
    const s = (await st.json()) as { status: string };
    if (s.status === "COMPLETED") {
      const out = await fetch(job.response_url, { headers });
      if (!out.ok) throw new GeminiError(`fal.ai error ${out.status}: ${(await out.text()).slice(0, 300)}`, out.status, null);
      return (await out.json()) as T;
    }
    if (s.status === "FAILED" || s.status === "ERROR") throw new GeminiError(`fal.ai job failed: ${JSON.stringify(s).slice(0, 300)}`, 500, null);
  }
  throw new GeminiError("fal.ai job timed out", 504, null);
}
