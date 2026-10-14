import Link from "next/link";
import { getDb } from "@/lib/db";
import { AdminAction } from "@/components/admin/AdminAction";
import { relativeTime } from "@/lib/util";

export const metadata = { title: "Moderation" };

const REASONS: Record<string, string> = {
  copyright: "Copyright complaint",
  inappropriate: "Inappropriate content",
  not_sleep_friendly: "Not sleep-friendly",
  impersonation: "Impersonation / voice",
  other: "Other",
};

export default async function ModerationPage() {
  const db = getDb();
  const [reports, series, episodes, profiles, rights] = await Promise.all([
    db.list("content_reports", { orderBy: { column: "created_at", ascending: false } }),
    db.list("series"),
    db.list("episodes"),
    db.list("creator_profiles"),
    db.list("rights_declarations", { orderBy: { column: "created_at", ascending: false } }),
  ]);
  const label = (type: string, id: string) =>
    type === "series" ? series.find((s) => s.id === id)?.title : type === "episode" ? episodes.find((e) => e.id === id)?.title : profiles.find((p) => p.user_id === id)?.display_name;
  const link = (type: string, id: string) =>
    type === "series" ? `/series/${series.find((s) => s.id === id)?.slug}` : type === "episode" ? `/listen/${id}` : `/profile/${profiles.find((p) => p.user_id === id)?.username}`;
  const open = reports.filter((r) => r.status === "open");
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-labelledby="reports-h">
        <h2 id="reports-h" className="headline text-3xl">Reports <span className="text-mist">({open.length} open)</span></h2>
        <p className="text-sm text-mist">Listener reports and copyright complaints. Takedowns remove content from the catalogue immediately.</p>
        <ul className="mt-4 space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="card p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="chip mr-2">{REASONS[r.reason]}</span>
                  <Link href={link(r.target_type, r.target_id)} className="font-medium hover:underline">{label(r.target_type, r.target_id) ?? r.target_id}</Link>
                  <span className="ml-2 text-xs text-mist">{r.target_type} · {relativeTime(r.created_at)}</span>
                </div>
                <span className="text-xs text-mist">{r.status}</span>
              </div>
              {r.details && <p className="mt-2 text-mist">“{r.details}”</p>}
              {r.resolution && <p className="mt-1 text-xs text-mist">Resolution: {r.resolution}</p>}
              {r.status === "open" && (
                <div className="mt-3 flex gap-2">
                  <AdminAction endpoint={`/api/admin/reports/${r.id}`} body={{ action: "dismiss", note: "Reviewed – no violation found." }} label="Dismiss" />
                  {r.target_type !== "creator" && <AdminAction endpoint={`/api/admin/reports/${r.id}`} body={{ action: "takedown", note: "Removed following review." }} label="Take down" className="btn-danger" confirmText="Remove this content from the catalogue?" />}
                </div>
              )}
            </li>
          ))}
          {reports.length === 0 && <li className="text-sm text-mist">No reports yet.</li>}
        </ul>
      </section>
      <aside aria-labelledby="rights-h" className="space-y-3">
        <h2 id="rights-h" className="headline text-2xl">Rights declarations</h2>
        <ul className="space-y-2 text-xs">
          {rights.slice(0, 20).map((r) => (
            <li key={r.id} className="rounded-2xl bg-white/[0.03] p-3">
              <div className="font-medium">{series.find((s) => s.id === r.series_id)?.title}</div>
              <div className="text-mist">Original: {r.original_work ? "yes" : "no"} · AI-assisted: {r.ai_assisted ? "yes" : "no"} · Voice consent: {r.voice_consent ? "yes" : "no"}</div>
              <div className="text-mist">Third-party: {r.third_party_material}</div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
