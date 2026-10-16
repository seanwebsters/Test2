import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { releaseDueEpisodes } from "@/lib/services/releases";

/**
 * Heartbeat for serverless deployments (Vercel Cron → GET /api/cron/tick):
 * publishes approved episodes whose release time has arrived and notifies
 * followers. Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (env.cronSecret ? auth !== `Bearer ${env.cronSecret}` : env.appEnv === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const released = await releaseDueEpisodes();
  log.info("cron", "tick", { released });
  return NextResponse.json({ ok: true, released });
}
