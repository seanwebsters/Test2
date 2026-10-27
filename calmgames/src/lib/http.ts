import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";
import { describeError } from "./ai/client";

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

/** Typed route wrapper: consistent JSON errors, no stack traces leaked. */
export function route<C>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: "Invalid request", issues: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: describeError(e) }, { status: 500 });
    }
  };
}

export async function body<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Expected a JSON body");
  }
  return schema.parse(raw);
}

// ── Rate limiting (per client, sliding one-minute window, in memory) ────
const g = globalThis as unknown as { __calmHits?: Map<string, number[]> };
const hits: Map<string, number[]> = (g.__calmHits ??= new Map());

export function rateLimit(req: Request, bucket: string, perMinute = Number(process.env.RATE_LIMIT_PER_MINUTE || 6)) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) throw new HttpError(429, `Too many requests. You can start ${perMinute} per minute; try again shortly.`);
  recent.push(now);
  hits.set(key, recent);
}
