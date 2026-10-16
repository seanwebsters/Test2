import { getDb } from "@/lib/db";
import { AGENT_BY_KEY } from "@/lib/studio/agents";
import { formatCents } from "@/lib/util";
import { isStaff } from "@/app/admin/staff";

export const metadata = { title: "Analytics" };

/** One measure per table; the inline bar is a single-hue magnitude cue next to the number. */
function BarTable({ caption, unit, rows }: { caption: string; unit: string; rows: { label: string; value: number; display: string; note?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <table className="w-full text-sm">
      <caption className="mb-2 text-left text-xs uppercase tracking-wider text-mist">{caption}</caption>
      <thead className="sr-only"><tr><th>Item</th><th>{unit}</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-white/5">
            <td className="w-[38%] py-2 pr-3 text-white/90">{r.label}{r.note && <span className="block text-xs text-mist">{r.note}</span>}</td>
            <td className="py-2">
              <div className="flex items-center gap-3">
                <div className="h-2.5 flex-1 rounded-r bg-white/[0.04]" title={`${r.label}: ${r.display}`}>
                  <div className="h-full rounded-r bg-lavender" style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value > 0 ? 2 : 0 }} />
                </div>
                <span className="w-24 shrink-0 text-right tabular-nums text-white/90">{r.display}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function Analytics() {
  if (!(await isStaff())) return null;
  const db = getDb();
  const [events, series, usage, runs, steps] = await Promise.all([db.list("listening_events"), db.list("series"), db.list("usage_records"), db.list("workflow_runs", { where: { kind: "episode_production" } }), db.list("workflow_steps", { where: { type: "ep.synthesis" } })]);
  const real = events.filter((e) => !e.is_sample);
  const bySeries = series
    .map((s) => {
      const ev = real.filter((e) => e.series_id === s.id);
      const plays = ev.filter((e) => e.kind === "play").length;
      const completes = ev.filter((e) => e.kind === "complete").length;
      return { s, hours: ev.reduce((n, e) => n + e.listened_seconds, 0) / 3600, plays, completion: plays ? completes / plays : 0 };
    })
    .filter((x) => x.plays || x.hours)
    .sort((a, b) => b.hours - a.hours);
  const byProvider = ["anthropic", "gemini", "elevenlabs"].map((p) => ({ label: p === "anthropic" ? "Claude" : p === "gemini" ? "Nano Banana" : "ElevenLabs", value: usage.filter((u) => u.provider === p).reduce((n, u) => n + u.cost_cents, 0) }));
  const agents = [...new Set(usage.map((u) => u.agent))];
  const byAgent = agents.map((a) => ({ label: AGENT_BY_KEY[a].name, value: usage.filter((u) => u.agent === a).reduce((n, u) => n + u.cost_cents, 0) })).sort((a, b) => b.value - a.value);
  const finished = runs.filter((r) => r.status === "succeeded" || r.status === "awaiting_approval");
  const rounds = finished.map((r) => steps.filter((s) => s.run_id === r.id).length).filter(Boolean);
  const total = usage.reduce((n, u) => n + u.cost_cents, 0);
  const tokens = usage.reduce((n, u) => n + u.input_tokens + u.output_tokens, 0);
  return (
    <div className="space-y-10">
      <h1 className="font-serif text-5xl text-white">Analytics</h1>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Headline numbers">
        {[
          ["Real listening hours", (real.reduce((n, e) => n + e.listened_seconds, 0) / 3600).toFixed(1)],
          ["Total production spend", formatCents(total)],
          ["Avg editorial rounds / episode", rounds.length ? (rounds.reduce((a, b) => a + b, 0) / rounds.length).toFixed(1) : "—"],
          ["Tokens used", tokens.toLocaleString()],
        ].map(([l, v]) => (
          <div key={l} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"><div className="text-xs uppercase tracking-wider text-mist">{l}</div><div className="mt-1 font-serif text-4xl text-white">{v}</div></div>
        ))}
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-serif text-3xl text-white">Audience</h2>
        <p className="text-sm text-mist">Real listening only – seeded sample data is excluded. The Program Director reads the same numbers when proposing new series.</p>
        {bySeries.length ? (
          <div className="mt-4 grid gap-8 lg:grid-cols-2">
            <BarTable caption="Listening hours by series" unit="hours" rows={bySeries.map((x) => ({ label: x.s.title, value: x.hours, display: `${x.hours.toFixed(1)} h` }))} />
            <BarTable caption="Completion rate by series" unit="percent" rows={bySeries.map((x) => ({ label: x.s.title, value: x.completion, display: `${Math.round(x.completion * 100)}%`, note: `${x.plays} plays` }))} />
          </div>
        ) : (
          <p className="mt-4 text-mist">No real listening yet. Numbers appear here as listeners play episodes.</p>
        )}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-serif text-2xl text-white">Spend by provider</h2>
          <div className="mt-3"><BarTable caption="Estimated cost from list prices" unit="cost" rows={byProvider.map((r) => ({ ...r, display: formatCents(r.value) }))} /></div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-serif text-2xl text-white">Spend by agent</h2>
          <div className="mt-3">{byAgent.length ? <BarTable caption="Estimated cost" unit="cost" rows={byAgent.map((r) => ({ ...r, display: formatCents(r.value) }))} /> : <p className="text-mist">No provider calls yet.</p>}</div>
        </div>
      </section>
    </div>
  );
}
