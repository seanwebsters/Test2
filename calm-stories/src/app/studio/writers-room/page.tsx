import Link from "next/link";
import { getDb } from "@/lib/db";
import { cx, relativeTime } from "@/lib/util";
import { isStaff } from "@/app/admin/staff";

export const metadata = { title: "Writers' Room" };

export default async function WritersRoom() {
  if (!(await isStaff())) return null;
  const db = getDb();
  const runs = await db.list("workflow_runs", { where: { kind: "episode_production" }, orderBy: { column: "created_at", ascending: false } });
  const epIds = [...new Set(runs.map((r) => r.episode_id).filter(Boolean))] as string[];
  const episodes = epIds.length ? await db.list("episodes", { where: { id: epIds } }) : [];
  const series = await db.list("series");
  const scripts = epIds.length ? await db.list("deliverables", { where: { episode_id: epIds, key: "script" } }) : [];
  return (
    <div className="space-y-8">
      <h1 className="font-serif text-5xl text-white">Writers&rsquo; Room</h1>
      <p className="max-w-3xl text-mist">Every episode moves through outline → scene plan → first draft → six editorial reviews → the Creative Director&rsquo;s synthesis → targeted rewrites → final script. Open an episode to read drafts side by side, see every critique with its evidence, and edit any version yourself.</p>
      <ul className="space-y-3">
        {epIds.map((id) => {
          const ep = episodes.find((e) => e.id === id);
          const s = series.find((x) => x.id === ep?.series_id);
          const run = runs.find((r) => r.episode_id === id)!;
          const versions = scripts.filter((d) => d.episode_id === id);
          return (
            <li key={id}>
              <Link href={`/studio/writers-room/${id}`} className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 hover:border-lavender/40">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-mist">{s?.title} · Episode {ep?.number}</div>
                  <div className="font-serif text-2xl text-white">{ep?.title}</div>
                  <div className="text-xs text-mist">{versions.length} script version(s) · {relativeTime(run.updated_at)}</div>
                </div>
                <span className={cx("rounded-full px-2.5 py-1 text-xs", ep?.status === "published" ? "bg-emerald-300/15 text-emerald-200" : "bg-lavender/15 text-lavender")}>{ep?.status.replace("_", " ")}</span>
              </Link>
            </li>
          );
        })}
        {!epIds.length && <li className="text-mist">No episodes have been written yet. Greenlight a series to start episode one.</li>}
      </ul>
    </div>
  );
}
