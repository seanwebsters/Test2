import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { HttpError, badRequest, tooMany } from "./errors";
import { log } from "./log";
import { rateLimit } from "./rate-limit";

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response | unknown>;

/** Wraps a route handler with consistent JSON errors and logging. */
export function route<C = unknown>(handler: Handler<C>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      const out = await handler(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Invalid input", code: "validation", issues: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
          { status: 400 },
        );
      }
      log.error("api", "Unhandled error", { path: req.nextUrl.pathname, error: String(err) });
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Request body must be JSON.");
  }
  return schema.parse(raw);
}

export function clientKey(req: NextRequest, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  return `ip:${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}`;
}

export function enforceRateLimit(key: string, capacity = 30, perMinute = 30) {
  if (!rateLimit(key, capacity, perMinute)) throw tooMany();
}
