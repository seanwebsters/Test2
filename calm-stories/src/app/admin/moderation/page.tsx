import { getDb } from "@/lib/db";
import { ModerationQueue, type ReportRow } from "@/components/admin/ModerationQueue";

export const metadata = { title: "Moderation" };

export default async function ModerationPage() {
  const db = getDb();
  const [reports, series, episodes, users] = await Promise.all([
    db.list("content_reports", { orderBy: { column: "created_at", ascending: false } }),
    db.list("series"),
    db.list("episodes"),
    db.list("users"),
  ]);
  const seriesById = new Map(series.map((s) => [s.id, s]));
  const epById = new Map(episodes.map((e) => [e.id, e]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const rows: ReportRow[] = reports.map((r) => {
    let label = "Unknown";
    let seriesId: string | null = null;
    let seriesStatus: string | null = null;
    let link: string | null = null;
    if (r.target_type === "series") {
      const s = seriesById.get(r.target_id);
      label = s ? s.title : "Deleted series";
      seriesId = s?.id ?? null;
      seriesStatus = s?.status ?? null;
      link = s ? `/series/${s.slug}` : null;
    } else if (r.target_type === "episode") {
      const e = epById.get(r.target_id);
      const s = e ? seriesById.get(e.series_id) : undefined;
      label = e ? `${s?.title ?? "Series"}: ${e.title}` : "Deleted episode";
      seriesId = s?.id ?? null;
      seriesStatus = s?.status ?? null;
      link = e && s ? `/listen/${e.id}` : null;
    } else {
      label = userById.get(r.target_id)?.display_name ?? "Unknown creator";
      link = null;
    }
    return {
      id: r.id,
      targetType: r.target_type,
      label,
      link,
      seriesId,
      seriesStatus,
      official: seriesId ? (seriesById.get(seriesId)?.is_official ?? false) : false,
      reason: r.reason,
      details: r.details,
      reporter: r.reporter_id ? (userById.get(r.reporter_id)?.display_name ?? "Listener") : "Anonymous",
      status: r.status,
      resolution: r.resolution,
      createdAt: r.created_at,
    };
  });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-4xl font-semibold">Moderation</h1>
        <p className="mt-1 text-sm text-mist">Listener reports about series, episodes and creators. Removing a series hides it everywhere and notifies its creator.</p>
      </header>
      <ModerationQueue rows={rows} />
    </div>
  );
}
