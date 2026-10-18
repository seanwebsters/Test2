import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { setSessionUser } from "@/lib/auth/session";
import { getStore } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { ServiceError } from "@/lib/services/core";
import { authenticate } from "@/lib/services/users";

const input = z.object({ username: z.string().min(1).max(40), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!rateLimit(`signin:${ip}`, 10, 60_000).ok) throw new ServiceError("rate_limited", "Too many attempts. Try again in a minute.", 429);
    const body = input.parse(await req.json());
    const user = authenticate(getStore().read(), body.username, body.password);
    if (!user) throw new ServiceError("bad_credentials", "Username or password is incorrect", 401);
    await setSessionUser(user.id);
    return NextResponse.json({ ok: true, username: user.username, role: user.role });
  } catch (e) {
    return errorResponse(e);
  }
}
