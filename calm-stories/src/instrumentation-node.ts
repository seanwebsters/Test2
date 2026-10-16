const g = globalThis as unknown as { __calmHeartbeat?: NodeJS.Timeout };

// Single-server heartbeat: release approved episodes when their time arrives.
if (process.env.DISABLE_HEARTBEAT !== "1" && !g.__calmHeartbeat) {
  g.__calmHeartbeat = setInterval(async () => {
    try {
      const { releaseDueEpisodes } = await import("@/lib/services/releases");
      await releaseDueEpisodes();
    } catch (err) {
      console.error(JSON.stringify({ level: "error", scope: "heartbeat", message: String(err) }));
    }
  }, 60_000);
}

export {};
