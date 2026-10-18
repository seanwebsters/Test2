import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { currentUser } from "@/lib/auth/session";
import type { User } from "@/lib/db/types";
import { rateLimit } from "@/lib/rate-limit";
import { ServiceError } from "@/lib/services/core";

export function errorResponse(e: unknown) {
  if (e instanceof ServiceError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
  if (e instanceof ZodError) return NextResponse.json({ error: "invalid", message: e.issues[0]?.message ?? "Invalid request", issues: e.issues }, { status: 400 });
  console.error("[nexara] unexpected error", e);
  return NextResponse.json({ error: "server_error", message: "Something went wrong" }, { status: 500 });
}

interface Options<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: ZodType<T, ZodTypeDef, any>;
  admin?: boolean;
  /** Requests per minute per user */
  limit?: number;
  limitKey?: string;
}

/** JSON route wrapper: session, validation, rate limiting and error mapping. */
export function route<T, R>(opts: Options<T>, fn: (ctx: { user: User; body: T; req: Request }) => Promise<R>) {
  return async (req: Request) => {
    try {
      const user = await currentUser();
      if (!user) throw new ServiceError("unauthenticated", "No session", 401);
      if (opts.admin && user.role !== "admin") throw new ServiceError("forbidden", "Administrator access required", 403);
      if (opts.limit) {
        const rl = rateLimit(`${opts.limitKey ?? new URL(req.url).pathname}:${user.id}`, opts.limit, 60_000);
        if (!rl.ok) return NextResponse.json({ error: "rate_limited", message: "Slow down a little and try again." }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } });
      }
      let body = undefined as T;
      if (opts.schema) {
        const raw = req.method === "GET" ? Object.fromEntries(new URL(req.url).searchParams) : await req.json().catch(() => ({}));
        body = opts.schema.parse(raw);
      }
      const result = await fn({ user, body, req });
      return NextResponse.json(result ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}
