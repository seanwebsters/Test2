/**
 * Local/single-server heartbeat. In serverless deployments use Vercel Cron
 * (vercel.json → /api/cron/tick) or Trigger.dev schedules instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if ((process.env.JOB_DRIVER ?? "inline") !== "inline" || process.env.DISABLE_HEARTBEAT === "1") return;
  const g = globalThis as unknown as { __calmHeartbeat?: NodeJS.Timeout };
  if (g.__calmHeartbeat) return;
  g.__calmHeartbeat = setInterval(async () => {
    try {
      await import("@/lib/jobs/workflows");
      const { processQueue } = await import("@/lib/jobs/runner");
      const { releaseDueEpisodes, runScheduledProduction } = await import("@/lib/production/scheduler");
      await releaseDueEpisodes();
      await runScheduledProduction();
      await processQueue();
    } catch (err) {
      console.error(JSON.stringify({ level: "error", scope: "heartbeat", message: String(err) }));
    }
  }, 60_000);
}
