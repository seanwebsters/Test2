import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { releaseDueEpisodes } from "@/lib/services/releases";
import { processQueue, runScheduledProduction } from "@/lib/agents";

export const maxDuration = 800;

/**
 * Heartbeat for serverless deployments (Vercel Cron → GET /api/cron/tick):
 * schedules agent production, runs queued production jobs, and publishes
 * approved episodes whose release time has arrived. Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (env.cronSecret ? auth !== `Bearer ${env.cronSecret}` : env.appEnv === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scheduled = await runScheduledProduction();
  const started = await processQueue({ wait: true });
  const released = await releaseDueEpisodes();
  log.info("cron", "tick", { scheduled: scheduled.length, started, released });
  return NextResponse.json({ ok: true, scheduled: scheduled.length, started, released });
}
