import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { releaseDueEpisodes } from "@/lib/services/releases";
import { removeDemoCatalogue } from "@/lib/services/demo-catalogue";
import { runAutopilot, runScheduledProduction, runUntil } from "@/lib/studio";

export const maxDuration = 800;

/** Stop starting new steps after this long, leaving headroom for in-flight ones to finish. */
const WORK_MS = Number(process.env.CRON_WORK_SECONDS ?? 240) * 1000;

/**
 * Heartbeat for serverless deployments (Vercel Cron → GET /api/cron/tick):
 * commissions scheduled episodes, advances studio workflows stage after stage
 * for up to CRON_WORK_SECONDS (default 240), and publishes approved episodes that are due.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (env.cronSecret ? auth !== `Bearer ${env.cronSecret}` : env.appEnv === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deadline = Date.now() + WORK_MS;
  await removeDemoCatalogue();
  await runAutopilot();
  const scheduled = await runScheduledProduction();
  const started = await runUntil(deadline);
  const released = await releaseDueEpisodes();
  log.info("cron", "tick", { scheduled: scheduled.length, started, released });
  return NextResponse.json({ ok: true, scheduled: scheduled.length, started, released });
}
