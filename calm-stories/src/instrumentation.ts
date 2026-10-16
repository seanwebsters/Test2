/**
 * Local/single-server release heartbeat. In serverless deployments use Vercel Cron
 * (vercel.json → /api/cron/tick) instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
