import Link from "next/link";
import { getDb } from "@/lib/db";
import { getAiSettings } from "@/lib/ai";
import { monthCosts } from "@/lib/jobs/engine";
import { releaseDue } from "@/lib/publishing";
import { formatCents, formatDateTime, relativeTime } from "@/lib/util";
import { SeriesManager } from "@/components/admin/SeriesManager";
import { StatusPill } from "@/components/storymaker/ui";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  await releaseDue(); // keeps the prototype moving without a cron
  const db = getDb();
  const [series, episodes, jobs, reports, reviews, schedules, users, settings, costs] = await Promise.all([
    db.list("series"),
    db.list("episodes"),
    db.list("ai_production_jobs", { orderBy: { column: "created_at", ascending: false } }),
    db.list("content_reports", { where: { status: "open" } }),
    db.list("editorial_reviews", { where: { status: "pending" } }),
    db.list("publishing_schedules", { where: { status: "scheduled" }, orderBy: { column: "release_at" } }),
    db.list("users"),
    getAiSettings(),
    monthCosts(),
  ]);
  const weekAgo = Date.now() - 7 * 86400_000;
  const events = (await db.list("listening_events")).filter((e) => new Date(e.created_at).getTime() >= weekAgo);
  const listenedHours = events.reduce((a, e) => a + e.listened_seconds, 0) / 3600;
  const epById = new Map(episodes.map((e) => [e.id, e]));
  const seriesById = new Map(series.map((s) => [s.id, s]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const kpis: [string, string, string?][] = [
    ["Published series", String(series.filter((s) => s.status === "published").length), `${series.filter((s) => s.is_official && s.status === "published").length} Calm Originals`],
    ["Awaiting review", String(reviews.length), reviews.length ? "Editorial queue" : "Queue is clear"],
    ["Jobs running", String(jobs.filter((j) => j.status === "running" || j.status === "queued").length), `${jobs.filter((j) => j.status === "failed").length} failed`],
    ["Open reports", String(reports.length)],
    ["AI spend this month", formatCents(costs.totalCents), `of ${formatCents(settings.monthly_cost_limit_cents)} limit · ${costs.simulatedCalls} simulated calls`],
    ["Listening (7 days)", `${listenedHours.toFixed(1)} h`, `${new Set(events.map((e) => e.user_id ?? e.anonymous_id)).size} listeners`],
  ];
  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-4xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-mist">Everything is reviewed by an editor before it goes live.</p>
      </header>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([k, v, sub]) => (
          <div key={k} className="card-surface p-4">
            <dt className="text-xs text-mist">{k}</dt>
            <dd className="mt-1 font-serif text-3xl font-semibold">{v}</dd>
            {sub && <dd className="mt-1 text-[11px] text-mist">{sub}</dd>}
          </div>
        ))}
      </dl>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-semibold">Recent production jobs</h2>
            <Link href="/admin/agents" className="text-sm text-lavender">All jobs</Link>
          </div>
          <ul className="mt-3 divide-y divide-white/5 text-sm">
            {jobs.slice(0, 6).map((j) => {
              const ep = j.episode_id ? epById.get(j.episode_id) : null;
              const done = j.steps.filter((s) => s.status === "succeeded").length;
              return (
                <li key={j.id} className="flex flex-wrap items-center gap-2 py-2.5">
                  <Link href={`/admin/agents?job=${j.id}`} className="font-medium hover:text-lavender">{seriesById.get(j.series_id ?? "")?.title ?? "Series"}{ep ? `: ${ep.title}` : ""}</Link>
                  <span className="text-xs text-mist">{done}/{j.steps.length} steps · {relativeTime(j.created_at)}</span>
                  <span className="ml-auto"><StatusPill status={j.status} /></span>
                </li>
              );
            })}
            {!jobs.length && <li className="py-3 text-mist">No jobs yet. Start one from Agents & jobs.</li>}
          </ul>
        </section>
        <section className="card-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-semibold">Upcoming releases</h2>
            <Link href="/admin/calendar" className="text-sm text-lavender">Calendar</Link>
          </div>
          <ul className="mt-3 divide-y divide-white/5 text-sm">
            {schedules.slice(0, 8).map((s) => {
              const ep = epById.get(s.episode_id);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-2 py-2.5">
                  <span className="w-44 shrink-0 text-xs text-mist">{formatDateTime(s.release_at)}</span>
                  <span className="min-w-0 flex-1 truncate">{seriesById.get(s.series_id)?.title}: {ep?.title}</span>
                  {ep && <StatusPill status={ep.status} />}
                </li>
              );
            })}
            {!schedules.length && <li className="py-3 text-mist">Nothing scheduled.</li>}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="font-serif text-2xl font-semibold">Series</h2>
        <SeriesManager
          rows={series
            .sort((a, b) => Number(b.is_official) - Number(a.is_official) || a.title.localeCompare(b.title))
            .map((s) => ({
              id: s.id,
              slug: s.slug,
              title: s.title,
              status: s.status,
              official: s.is_official,
              creator: userById.get(s.creator_id)?.display_name ?? "Unknown",
              episodes: episodes.filter((e) => e.series_id === s.id).length,
              published: episodes.filter((e) => e.series_id === s.id && e.status === "published").length,
            }))}
        />
      </section>
    </div>
  );
}
