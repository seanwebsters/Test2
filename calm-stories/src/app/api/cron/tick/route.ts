import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import "@/lib/jobs/workflows";
import { processQueue } from "@/lib/jobs/runner";
import { runScheduledProduction, releaseDueEpisodes } from "@/lib/production/scheduler";

export const maxDuration = 300;

/**
 * Heartbeat for serverless deployments (Vercel Cron → GET /api/cron/tick).
 * Starts queued jobs, schedules automated production and releases approved
 * episodes whose scheduled time has arrived. Protected by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (env.cronSecret ? auth !== `Bearer ${env.cronSecret}` : env.appEnv === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const released = await releaseDueEpisodes();
  const scheduled = await runScheduledProduction();
  const started = await processQueue({ wait: false });
  log.info("cron", "tick", { released, scheduled: scheduled.length, started });
  return NextResponse.json({ ok: true, released, scheduled, started });
}
