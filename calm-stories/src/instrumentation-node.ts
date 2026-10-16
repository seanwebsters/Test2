const g = globalThis as unknown as { __calmHeartbeat?: NodeJS.Timeout };

// Single-server heartbeat: schedule agent production for active workflows,
// run queued jobs, and release approved episodes when their time arrives.
if (process.env.DISABLE_HEARTBEAT !== "1" && !g.__calmHeartbeat) {
  const tick = async () => {
    try {
      const { releaseDueEpisodes } = await import("@/lib/services/releases");
      const { runScheduledProduction, processQueue } = await import("@/lib/agents");
      await runScheduledProduction();
      await processQueue();
      await releaseDueEpisodes();
    } catch (err) {
      console.error(JSON.stringify({ level: "error", scope: "heartbeat", message: String(err) }));
    }
  };
  g.__calmHeartbeat = setInterval(tick, 60_000);
  setTimeout(tick, 5_000);
}

export {};
