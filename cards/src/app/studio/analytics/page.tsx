import Link from "next/link";
import { pct } from "@/components/studio/Charts";
import { WeightsForm } from "@/components/studio/WeightsForm";
import { btn } from "@/components/ui/styles";
import { now } from "@/lib/clock";
import { getStore } from "@/lib/db";
import { ipPerformance, METRIC_LABELS } from "@/lib/studio/analytics";

export const metadata = { title: "IP Performance" };

export default async function StudioAnalytics({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  const includeDemo = demo === "1";
  const state = getStore().read();
  const rows = ipPerformance(state, now(), includeDemo);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">IP Performance</h1>
          <p className="mt-1 max-w-2xl text-sm text-bone-3">Which worlds are earning more investment. The opportunity score is a transparent weighted blend of the metrics below, normalised across live universes (0–100). It's a signal to investigate, not a forecast of commercial success.</p>
        </div>
        <Link href={includeDemo ? "/studio/analytics" : "/studio/analytics?demo=1"} className={btn("glass", "sm")}>{includeDemo ? "Exclude demo collectors" : "Include demo collectors"}</Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-bone-4">
            <tr><th className="p-2.5">Universe</th><th className="text-right">Score</th><th className="text-right">Collectors</th><th className="text-right">Follows</th><th className="text-right">Follow growth</th><th className="text-right">1st-pack conv.</th><th className="text-right">Repeat</th><th className="text-right">Retention</th><th className="text-right">Depth</th><th className="text-right">Story</th><th className="text-right">Shares</th><th className="text-right">Days active</th><th className="p-2.5">Signals</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="p-2.5"><Link href={`/studio/universes/${r.id}`} className="font-semibold hover:underline">{r.title}</Link>{r.source === "studio" && <span className="ml-1 text-[10px] text-bone-4">studio</span>}</td>
                <td className="text-right"><span className="inline-flex items-center gap-2"><span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10"><span className="block h-full bg-ember" style={{ width: `${r.score}%` }} /></span><b className="tabular-nums">{r.lowData ? "—" : r.score}</b></span></td>
                <td className="text-right tabular-nums">{r.collectors}</td>
                <td className="text-right tabular-nums">{r.follows}</td>
                <td className="text-right tabular-nums">{pct(r.followGrowth)}</td>
                <td className="text-right tabular-nums">{pct(r.firstPackConversion)}</td>
                <td className="text-right tabular-nums">{pct(r.repeatCollecting)}</td>
                <td className="text-right tabular-nums">{pct(r.retention)}</td>
                <td className="text-right tabular-nums">{pct(r.depth)}</td>
                <td className="text-right tabular-nums">{pct(r.storyCompletion)}</td>
                <td className="text-right tabular-nums">{r.shares}</td>
                <td className="text-right tabular-nums">{r.returnFrequency?.toFixed(1) ?? "—"}</td>
                <td className="p-2.5 text-[12px]">{r.lowData ? <span className="text-bone-4">Not enough data</span> : r.signals.length ? r.signals.join(" · ") : <span className="text-bone-4">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-bone-4">Revenue per universe: not available — payments aren't enabled. Universes with fewer than 3 collectors aren't scored.</p>
      <section className="mt-8 rounded-2xl border border-white/10 bg-ink-2 p-5">
        <h2 className="font-bold">Opportunity score weights</h2>
        <p className="mb-4 mt-1 text-sm text-bone-3">Adjust how much each signal counts. Changes are audited.</p>
        <WeightsForm initial={state.opportunityWeights} labels={METRIC_LABELS} />
      </section>
    </div>
  );
}
