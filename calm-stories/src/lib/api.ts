import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AuthError } from "@/lib/auth/policy";
import { rateLimit } from "@/lib/ratelimit";
import { log } from "@/lib/log";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

function clientKey(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export interface RouteOptions {
  /** Requests per minute per client for this route bucket. */
  limit?: number;
  bucket?: string;
}

/**
 * Wraps a route handler with rate limiting and consistent error responses.
 * Errors are logged server-side; clients get a safe message.
 */
export function route<C>(handler: (req: Request, ctx: C) => Promise<Response>, opts: RouteOptions = {}) {
  return async (req: Request, ctx: C): Promise<Response> => {
    const bucket = opts.bucket ?? new URL(req.url).pathname.split("/").slice(0, 3).join("/");
    if (!rateLimit(`${bucket}:${clientKey(req)}`, opts.limit ?? 120)) {
      return json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AuthError) return json({ error: err.message }, { status: err.status });
      if (err instanceof HttpError) return json({ error: err.message }, { status: err.status });
      if (err instanceof ZodError) return json({ error: "Invalid request", issues: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
      log.error("api", `${req.method} ${new URL(req.url).pathname} failed`, err);
      return json({ error: err instanceof Error ? err.message : "Something went wrong" }, { status: 500 });
    }
  };
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON");
  }
  return schema.parse(raw);
}

/** Serves bytes with HTTP Range support so audio can seek. */
export function serveBytes(req: Request, bytes: Uint8Array, contentType: string, cache = "private, max-age=3600") {
  const size = bytes.byteLength;
  const range = req.headers.get("range");
  const headers: Record<string, string> = { "content-type": contentType, "accept-ranges": "bytes", "cache-control": cache };
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      let start = m[1] ? parseInt(m[1], 10) : NaN;
      let end = m[2] ? parseInt(m[2], 10) : size - 1;
      if (Number.isNaN(start)) {
        start = Math.max(0, size - end);
        end = size - 1;
      }
      end = Math.min(end, size - 1);
      if (start >= size || start > end) {
        return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
      }
      const chunk = bytes.subarray(start, end + 1);
      return new Response(Buffer.from(chunk), {
        status: 206,
        headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(chunk.byteLength) },
      });
    }
  }
  return new Response(Buffer.from(bytes), { status: 200, headers: { ...headers, "content-length": String(size) } });
}
