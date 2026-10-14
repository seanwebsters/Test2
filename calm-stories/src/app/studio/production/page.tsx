import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { studioProduction } from "@/lib/studio";
import { formatCents, formatDateTime } from "@/lib/util";
import { Empty } from "@/components/storymaker/ui";

export const metadata = { title: "AI usage" };

const CATEGORY: Record<string, string> = { llm: "Writing", tts: "Narration", image: "Artwork", audio_processing: "Audio processing" };

export default async function StudioProductionPage() {
  const d = await studioProduction(await getViewer());
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-4xl font-semibold">AI usage</h1>
        <p className="mt-1 max-w-3xl text-sm text-mist">
          Every AI generation for your series is recorded with the provider, model and estimated cost. Simulated generations are used when a provider isn’t connected and cost nothing.
        </p>
      </header>
      <p className="font-serif text-3xl font-semibold">{formatCents(d.totalCents)} <span className="text-base font-normal text-mist">estimated provider cost to date</span></p>

      {d.bySeries.length ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {d.bySeries.map((s) => (
            <li key={s.id} className="card-surface p-4">
              <Link href={`/studio/series/${s.id}`} className="font-serif text-xl font-semibold hover:text-lavender">{s.title}</Link>
              <p className="text-xs text-mist">{s.calls} generations · {s.simulated} simulated · {s.mixes} mixed episodes</p>
              <p className="mt-2 text-sm">{formatCents(s.costCents)}</p>
              <ul className="mt-2 flex flex-wrap gap-2 text-[11px] text-mist">
                {s.byCategory.filter((c) => c.count).map((c) => <li key={c.category} className="rounded-full bg-white/5 px-2 py-0.5">{CATEGORY[c.category]} {c.count}</li>)}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No series yet.</Empty>
      )}

      <section aria-labelledby="recent">
        <h2 id="recent" className="font-serif text-2xl font-semibold">Recent generations</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs text-mist">
              <tr><th className="py-2 pr-3 font-normal">When</th><th className="py-2 pr-3 font-normal">Series</th><th className="py-2 pr-3 font-normal">Kind</th><th className="py-2 pr-3 font-normal">Provider and model</th><th className="py-2 pr-3 font-normal">Units</th><th className="py-2 font-normal">Cost</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {d.recent.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 pr-3 text-xs text-mist">{formatDateTime(c.created_at)}</td>
                  <td className="py-2 pr-3 text-xs">{c.seriesTitle}</td>
                  <td className="py-2 pr-3 text-xs">{CATEGORY[c.category] ?? c.category}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{c.provider} · {c.model}</td>
                  <td className="py-2 pr-3 text-xs text-mist">{c.units.toLocaleString()} {c.unit_label}</td>
                  <td className="py-2 text-xs">{c.simulated ? "Simulated" : formatCents(c.cost_cents)}</td>
                </tr>
              ))}
              {!d.recent.length && <tr><td colSpan={6} className="py-3 text-mist">Nothing generated yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="tools">
        <h2 id="tools" className="font-serif text-2xl font-semibold">Storymaker actions</h2>
        <ul className="mt-3 divide-y divide-white/5 text-sm">
          {d.calls.map((c) => (
            <li key={c.id} className="flex flex-wrap gap-x-3 py-2">
              <span className="font-mono text-xs">{c.tool}</span>
              <span className="text-xs text-mist">{c.status.replace(/_/g, " ")}</span>
              <span className="ml-auto text-xs text-mist">{formatDateTime(c.created_at)}</span>
              {c.error && <span className="w-full text-xs text-rose-200">{c.error}</span>}
            </li>
          ))}
          {!d.calls.length && <li className="py-2 text-mist">No actions yet.</li>}
        </ul>
      </section>
    </div>
  );
}
