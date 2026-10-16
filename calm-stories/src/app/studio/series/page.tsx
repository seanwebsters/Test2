import Link from "next/link";
import { getDb } from "@/lib/db";
import { SceneArt } from "@/components/art/SceneArt";
import { cx, relativeTime } from "@/lib/util";
import { isStaff } from "@/app/admin/staff";

export const metadata = { title: "Series" };

const STATUS: Record<string, string> = { developing: "In development", awaiting_greenlight: "Awaiting greenlight", greenlit: "Greenlit", rejected: "Passed", failed: "Failed" };

export default async function SeriesList() {
  if (!(await isStaff())) return null;
  const db = getDb();
  const [projects, series, episodes] = await Promise.all([db.list("series_projects", { orderBy: { column: "created_at", ascending: false } }), db.list("series"), db.list("episodes")]);
  const studioIds = new Set(projects.map((p) => p.series_id).filter(Boolean));
  const catalogue = series.filter((s) => !studioIds.has(s.id) && s.status === "published");
  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end gap-4">
        <h1 className="font-serif text-5xl text-white">Series</h1>
        <Link href="/studio/series/new" className="btn-primary btn-sm ml-auto">+ New series</Link>
      </header>
      <section>
        <h2 className="label">Studio originals</h2>
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const s = p.series_id ? series.find((x) => x.id === p.series_id) : null;
            const eps = s ? episodes.filter((e) => e.series_id === s.id) : [];
            return (
              <li key={p.id}>
                <Link href={s ? `/studio/series/${s.id}` : `/studio/projects/${p.id}`} className="group block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] hover:border-lavender/40">
                  <div className="relative aspect-[3/2]">
                    {s ? <SceneArt spec={s.artwork} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center bg-gradient-to-br from-[#1b1f4a] to-[#0b1128] text-mist">Concepts in development…</div>}
                    <span className={cx("absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs backdrop-blur", p.status === "awaiting_greenlight" ? "bg-amber-300/80 text-night" : p.status === "greenlit" ? "bg-emerald-300/80 text-night" : "bg-black/50 text-white")}>{STATUS[p.status]}</span>
                  </div>
                  <div className="p-4">
                    <div className="font-serif text-2xl text-white">{s?.title ?? "Untitled project"}</div>
                    <p className="line-clamp-2 text-sm text-mist">{s?.tagline || p.brief}</p>
                    <p className="mt-2 text-xs text-mist">{eps.filter((e) => e.status === "published").length} live · {eps.filter((e) => ["draft", "in_review", "approved"].includes(e.status)).length} in progress · started {relativeTime(p.created_at)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
          {!projects.length && (
            <li className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-mist sm:col-span-2 xl:col-span-3">
              No studio series yet. <Link href="/studio/series/new" className="text-lavender">Write a brief</Link> and the team will develop concepts for your greenlight.
            </li>
          )}
        </ul>
      </section>
      {catalogue.length > 0 && (
        <section>
          <h2 className="label">Existing catalogue</h2>
          <p className="mb-3 text-sm text-mist">Series published before the studio. They have no series bible, so agents don&rsquo;t produce new episodes for them.</p>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6 xl:grid-cols-8">
            {catalogue.map((s) => (
              <li key={s.id} title={s.title} className="overflow-hidden rounded-xl border border-white/10">
                <div className="aspect-[3/4]"><SceneArt spec={s.artwork} className="h-full w-full" /></div>
                <div className="truncate px-2 py-1 text-[11px] text-mist">{s.title}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
