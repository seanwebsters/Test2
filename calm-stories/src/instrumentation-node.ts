const g = globalThis as unknown as { __calmHeartbeat?: NodeJS.Timeout };

// Single-server heartbeat: commission scheduled episodes, advance studio
// workflows, and release approved episodes when their time arrives.
if (process.env.DISABLE_HEARTBEAT !== "1" && !g.__calmHeartbeat) {
  const beat = async () => {
    try {
      const { releaseDueEpisodes } = await import("@/lib/services/releases");
      const { runAutopilot, runScheduledProduction, tick } = await import("@/lib/studio");
      const { removeDemoCatalogue } = await import("@/lib/services/demo-catalogue");
      await removeDemoCatalogue();
      await runAutopilot();
      await runScheduledProduction();
      await tick();
      await releaseDueEpisodes();
    } catch (err) {
      console.error(JSON.stringify({ level: "error", scope: "heartbeat", message: String(err) }));
    }
  };
  g.__calmHeartbeat = setInterval(beat, 30_000);
  setTimeout(beat, 5_000);
}

export {};
