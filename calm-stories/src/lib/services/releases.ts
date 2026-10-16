import "server-only";
import { getDb } from "@/lib/db";
import { track } from "@/lib/analytics";
import { newId, nowIso } from "@/lib/util";

/** Publish approved episodes whose release time has arrived, and notify followers. */
export async function releaseDueEpisodes(now = new Date()): Promise<number> {
  const db = getDb();
  const due = (await db.list("episodes", { where: { status: "approved" } })).filter((e) => e.release_at && new Date(e.release_at) <= now);
  for (const ep of due) {
    await db.update("episodes", ep.id, { status: "published", published_at: ep.release_at, updated_at: nowIso() });
    const sched = await db.findOne("publishing_schedules", { episode_id: ep.id, status: "scheduled" });
    if (sched) await db.update("publishing_schedules", sched.id, { status: "released", updated_at: nowIso() });
    const series = await db.get("series", ep.series_id);
    if (series && series.status !== "published") await db.update("series", series.id, { status: "published", published_at: series.published_at ?? nowIso(), updated_at: nowIso() });
    // Gentle, opt-out-able update for followers. No nudges, no streaks.
    const followers = await db.list("series_follows", { where: { series_id: ep.series_id } });
    for (const f of followers) {
      if (f.user_id.startsWith("usr_sample_")) continue;
      const prefs = await db.get("user_settings", f.user_id);
      if (prefs && !prefs.new_episode_updates) continue;
      await db.insert("notifications", {
        id: newId("ntf"),
        user_id: f.user_id,
        kind: "new_episode",
        title: `New episode of ${series?.title ?? "a series you follow"}`,
        body: `Episode ${ep.number}: ${ep.title}`,
        link: `/listen/${ep.id}`,
        read: false,
        created_at: nowIso(),
      });
    }
    await track("episode_released", "system", { episode_id: ep.id });
  }
  return due.length;
}
