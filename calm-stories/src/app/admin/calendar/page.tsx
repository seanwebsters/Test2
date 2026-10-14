import { getDb } from "@/lib/db";
import { Calendar, type CalItem } from "./Calendar";

export const metadata = { title: "Publishing calendar" };

const DAY = 86400000;

export default async function CalendarPage() {
  const db = getDb();
  const [episodes, series, reviews] = await Promise.all([db.list("episodes"), db.list("series"), db.list("editorial_reviews", { where: { status: "pending" } })]);
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const from = start.getTime() - 3 * DAY;
  const to = start.getTime() + 25 * DAY;
  const items: CalItem[] = [];
  for (const e of episodes) {
    const review = reviews.find((r) => r.episode_id === e.id);
    const at = e.status === "in_review" ? review?.requested_release_at ?? e.release_at : e.release_at;
    if (!at) continue;
    const t = new Date(at).getTime();
    if (t < from || t > to) continue;
    if (!["approved", "published", "in_review"].includes(e.status)) continue;
    const s = series.find((x) => x.id === e.series_id);
    items.push({ id: e.id, title: e.title, number: e.number, series: s?.title ?? "", series_id: e.series_id, hue: (s?.artwork.seed ?? 0) % 360, release_at: at, status: e.status });
  }
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="headline text-3xl">Publishing calendar</h2>
          <p className="text-sm text-mist">Drag an approved or in-review episode to another day to reschedule it (time of day is kept). Published episodes are locked.</p>
        </div>
        <div className="flex gap-3 text-xs text-mist">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /> Published</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-lavender" /> Scheduled</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /> Awaiting review</span>
        </div>
      </div>
      <Calendar items={items} startMs={from} days={28} />
    </div>
  );
}
