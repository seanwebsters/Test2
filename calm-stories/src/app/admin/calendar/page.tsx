import { getDb } from "@/lib/db";
import { releaseDue } from "@/lib/publishing";
import { PublishingCalendar, type CalendarEpisode } from "@/components/admin/PublishingCalendar";

export const metadata = { title: "Publishing calendar" };

export default async function CalendarPage() {
  await releaseDue();
  const db = getDb();
  const [episodes, series, schedules] = await Promise.all([db.list("episodes"), db.list("series"), db.list("publishing_schedules", { where: { status: "scheduled" } })]);
  const seriesById = new Map(series.map((s) => [s.id, s]));
  const scheduled = new Map(schedules.map((s) => [s.episode_id, s.release_at]));
  const recentCutoff = Date.now() - 7 * 86400_000;
  const rows: CalendarEpisode[] = episodes
    .filter((e) => e.status === "approved" || e.status === "in_review" || scheduled.has(e.id) || (e.status === "published" && e.published_at && new Date(e.published_at).getTime() >= recentCutoff))
    .map((e) => ({
      id: e.id,
      title: e.title,
      number: e.number,
      series: seriesById.get(e.series_id)?.title ?? "Series",
      official: seriesById.get(e.series_id)?.is_official ?? false,
      status: e.status,
      releaseAt: e.status === "published" ? e.published_at : (scheduled.get(e.id) ?? null),
      hasAudio: !!e.audio_asset_id,
    }));
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-4xl font-semibold">Publishing calendar</h1>
        <p className="mt-1 text-sm text-mist">Drag an episode onto a day to schedule it, or use its Move control. Only approved episodes with audio are released; episodes still in review keep their slot until an editor decides.</p>
      </header>
      <PublishingCalendar episodes={rows} />
    </div>
  );
}
