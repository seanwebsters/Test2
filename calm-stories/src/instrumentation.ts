/**
 * Local/single-server heartbeat. In serverless deployments use Vercel Cron
 * (vercel.json → /api/cron/tick) or Trigger.dev schedules instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
