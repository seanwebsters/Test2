import Link from "next/link";
import { BarChart, pct, Stat } from "@/components/studio/Charts";
import { btn } from "@/components/ui/styles";
import { now } from "@/lib/clock";
import { getStore } from "@/lib/db";
import { dashboardMetrics } from "@/lib/studio/analytics";

export const metadata = { title: "Overview" };

export default async function StudioOverview({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  const includeDemo = demo === "1";
  const state = getStore().read();
  const m = dashboardMetrics(state, now(), includeDemo);
  const jobs = [...state.jobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-bone-3">Live platform data from this deployment. {includeDemo ? "Including" : "Excluding"} the 8 seeded demo collectors.</p>
        </div>
        <div className="flex gap-2">
          <Link href={includeDemo ? "/studio" : "/studio?demo=1"} className={btn("glass", "sm")}>{includeDemo ? "Exclude demo collectors" : "Include demo collectors"}</Link>
          <Link href="/studio/generate" className={btn("primary", "sm")}>New universe with AI Studio</Link>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total users" value={m.totalUsers} note={`${m.registered} with accounts`} />
        <Stat label="Daily active" value={m.dau} note={`${m.wau} weekly active`} />
        <Stat label="Packs opened" value={m.packsOpened} note={`${m.packsToday} today`} />
        <Stat label="Cards collected" value={m.cardsCollected} />
        <Stat label="Story completion" value={pct(m.storyCompletion)} note={`${m.episodesCompleted} episodes finished`} />
        <Stat label="Collection completion" value={pct(m.collectionCompletion)} note="Avg share of a set owned" />
        <Stat label="Returned after day 1" value={pct(m.d1Retention)} note={`of ${m.d1Base} eligible users`} />
        <Stat label="Revenue" value="—" note="Payments not enabled (demo billing only)" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-ink-2 p-5">
          <h2 className="font-bold">Daily active users · 14 days</h2>
          <BarChart data={m.series.map((s) => ({ x: s.day, y: s.active }))} label="Daily active users, last 14 days" />
        </section>
        <section className="rounded-2xl border border-white/10 bg-ink-2 p-5">
          <h2 className="font-bold">Packs opened · 14 days</h2>
          <BarChart data={m.series.map((s) => ({ x: s.day, y: s.packs }))} label="Packs opened per day, last 14 days" />
        </section>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-white/10 bg-ink-2 p-5">
          <h2 className="font-bold">Top universes</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-bone-4"><tr><th className="py-1">Universe</th><th className="text-right">Packs</th><th className="text-right">Follows</th></tr></thead>
            <tbody>
              {m.top.map((u) => (
                <tr key={u.id} className="border-t border-white/5"><td className="py-2"><Link className="hover:underline" href={`/studio/universes/${u.id}`}>{u.title}</Link></td><td className="text-right tabular-nums">{u.packs}</td><td className="text-right tabular-nums">{u.follows}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="rounded-2xl border border-white/10 bg-ink-2 p-5">
          <h2 className="font-bold">Recent generation jobs</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {jobs.map((j) => (
              <li key={j.id}><Link href={`/studio/generate?job=${j.id}`} className="block rounded-xl bg-white/[0.03] p-3 hover:bg-white/[0.06]"><span className="line-clamp-1">{j.brief}</span><span className="text-[11px] text-bone-4">{j.status} · ${j.totalCostUsd.toFixed(3)}</span></Link></li>
            ))}
            {!jobs.length && <li className="text-bone-3">No jobs yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
