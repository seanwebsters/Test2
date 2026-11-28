import { NextResponse } from "next/server";
import { clamp, clientIp, imageLive, rateLimited } from "@/lib/server/ai";
import { demoImage } from "@/lib/server/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (rateLimited(clientIp(req), 12)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  let prompt = "";
  try {
    prompt = clamp((await req.json()).prompt, 1000);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!prompt.trim()) return NextResponse.json({ error: "Empty prompt" }, { status: 400 });

  if (imageLive()) {
    try {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: process.env.AIBI_IMAGE_MODEL || "gpt-image-1", prompt, size: "1024x1024", n: 1 }),
      });
      if (r.ok) {
        const j = (await r.json()) as { data?: { b64_json?: string; url?: string }[] };
        const d = j.data?.[0];
        const url = d?.b64_json ? `data:image/png;base64,${d.b64_json}` : d?.url;
        if (url) return NextResponse.json({ url, live: true });
      } else {
        console.warn("[aibi:image] provider error", r.status, (await r.text()).slice(0, 300));
      }
    } catch (e) {
      console.warn("[aibi:image] request failed", (e as Error).message);
    }
  }
  await new Promise((r) => setTimeout(r, 1200));
  const svg = demoImage(prompt);
  return NextResponse.json({ url: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, live: false });
}
