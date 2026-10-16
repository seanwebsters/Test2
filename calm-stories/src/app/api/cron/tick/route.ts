import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { releaseDueEpisodes } from "@/lib/services/releases";
import { runScheduledProduction, tick } from "@/lib/studio";

export const maxDuration = 800;

/**
 * Heartbeat for serverless deployments (Vercel Cron → GET /api/cron/tick):
 * commissions scheduled episodes, advances studio workflows (waiting for the
 * steps it starts), and publishes approved episodes that are due.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (env.cronSecret ? auth !== `Bearer ${env.cronSecret}` : env.appEnv === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scheduled = await runScheduledProduction();
  const started = await tick({ wait: true });
  const released = await releaseDueEpisodes();
  log.info("cron", "tick", { scheduled: scheduled.length, started, released });
  return NextResponse.json({ ok: true, scheduled: scheduled.length, started, released });
}
