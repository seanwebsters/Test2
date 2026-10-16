import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { SceneArt } from "@/components/art/SceneArt";
import { upcomingSlots } from "@/lib/agents/scheduler";
import { formatCents, relativeTime } from "@/lib/util";
import { isStaff } from "../../staff";
import { ProduceForm } from "../../agents/ProduceForm";
import { WorkflowForm } from "./WorkflowForm";

export const metadata = { title: "Series production" };

export default async function SeriesProductionPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isStaff())) return null;
  const { id } = await params;
  const db = getDb();
  const series = await db.get("series", id);
  if (!series) notFound();
  const [wf, jobs, eps] = await Promise.all([
    db.findOne("production_workflows", { series_id: id }),
    db.list("production_jobs", { where: { series_id: id }, orderBy: { column: "created_at", ascending: false }, limit: 10 }),
    db.list("episodes", { where: { series_id: id } }),
  ]);
  const slots = wf?.status === "active" ? upcomingSlots(wf, new Date()) : [];
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="flex items-center gap-4">
          <span className="h-24 w-18 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10" style={{ width: 72 }}>
            <SceneArt spec={series.artwork} className="h-full w-full" />
          </span>
          <div>
            <h2 className="headline text-3xl">{series.title}</h2>
            <p className="text-sm text-mist">{eps.length} episodes · {series.status} · <Link className="underline" href={`/series/${series.slug}`}>View series</Link></p>
          </div>
        </div>
        <h3 className="mt-8 font-serif text-2xl">Production schedule &amp; direction</h3>
        <p className="text-sm text-mist">When active, the agents make each episode about a day before its release slot and send it to the review queue.</p>
        <WorkflowForm
          seriesId={id}
          initial={
            wf ?? {
              status: "paused",
              episodes_per_week: 2,
              release_days: [2, 5],
              release_hour_utc: 20,
              target_minutes: 20,
              voice_id: null,
              art_style: "",
              story_notes: "",
              budget_cents: 500,
            }
          }
        />
      </div>
      <aside className="space-y-4">
        <div className="card p-4">
          <h3 className="font-medium">Make one now</h3>
          <p className="mb-3 text-xs text-mist">Runs the full crew once, outside the schedule.</p>
          <ProduceForm series={[{ id, title: series.title }]} defaultSeries={id} />
        </div>
        <div className="card p-4">
          <h3 className="font-medium">Next release slots</h3>
          {slots.length ? (
            <ul className="mt-2 space-y-1 text-sm text-mist">{slots.map((s) => <li key={s.toISOString()}>{s.toUTCString().slice(0, 22)} UTC</li>)}</ul>
          ) : (
            <p className="mt-1 text-sm text-mist">Schedule is paused.</p>
          )}
        </div>
        <div className="card p-4">
          <h3 className="font-medium">Recent runs</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {jobs.map((j) => (
              <li key={j.id} className="flex justify-between gap-2"><span className="truncate text-mist">{relativeTime(j.created_at)} · {formatCents(j.cost_cents)}</span><span>{j.status}</span></li>
            ))}
            {!jobs.length && <li className="text-mist">None yet.</li>}
          </ul>
          <Link href="/admin/agents" className="mt-3 inline-block text-xs underline">All runs</Link>
        </div>
      </aside>
    </div>
  );
}
