import Link from "next/link";
import { ReleaseControl } from "@/components/studio/ReleaseControl";
import { catalog, isReleased, releaseTime } from "@/lib/catalog";
import { DAY_MS, now } from "@/lib/clock";
import { getStore } from "@/lib/db";

export const metadata = { title: "Releases" };

export default async function StudioReleases() {
  const state = getStore().read();
  const at = now();
  const idx = catalog(state);
  const rows = idx.universes.flatMap((u) => u.episodes.map((e) => ({ u, e, t: releaseTime(idx, e.releaseOffsetDays), released: isReleased(idx, e.releaseOffsetDays, at) })));
  const upcoming = rows.filter((r) => !r.released).sort((a, b) => a.t - b.t);
  const recent = rows.filter((r) => r.released && r.t > at - 14 * DAY_MS).sort((a, b) => b.t - a.t);
  const seasons = idx.universes.flatMap((u) => u.seasons.filter((s) => !isReleased(idx, s.releaseOffsetDays, at)).map((s) => ({ u, s, t: releaseTime(idx, s.releaseOffsetDays) }))).sort((a, b) => a.t - b.t);
  const Table = ({ list }: { list: typeof rows }) => (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-bone-4"><tr><th className="p-2.5">When (UTC)</th><th>Universe</th><th>Episode</th><th className="text-right">New cards</th><th className="p-2.5 text-right">Schedule</th></tr></thead>
        <tbody>
          {list.map(({ u, e, t, released }) => (
            <tr key={e.id} className="border-t border-white/5">
              <td className="p-2.5 tabular-nums text-bone-2">{new Date(t).toISOString().slice(0, 16).replace("T", " ")}</td>
              <td><Link href={`/studio/universes/${u.id}`} className="hover:underline">{u.title}</Link></td>
              <td>E{e.number} · {e.title}</td>
              <td className="text-right tabular-nums">{e.cardIds.length}</td>
              <td className="p-2.5"><ReleaseControl episodeId={e.id} releaseAt={t} released={released} /></td>
            </tr>
          ))}
          {!list.length && <tr><td className="p-3 text-bone-4" colSpan={5}>Nothing here.</td></tr>}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Releases</h1>
        <p className="mt-1 text-sm text-bone-3">Episodes and the cards they introduce enter packs at their release time. Releasing now notifies followers immediately; scheduled releases notify followers when they next visit.</p>
      </div>
      <section><h2 className="mb-3 font-bold">Upcoming episodes</h2><Table list={upcoming} /></section>
      <section>
        <h2 className="mb-3 font-bold">Season launches</h2>
        <ul className="grid gap-2 md:grid-cols-2">{seasons.map(({ u, s, t }) => <li key={u.id + s.number} className="rounded-xl border border-white/10 bg-ink-2 p-3 text-sm"><b>{u.title}</b> · Season {s.number}: {s.title}<p className="text-bone-3">{new Date(t).toUTCString()}</p></li>)}</ul>
      </section>
      <section><h2 className="mb-3 font-bold">Released in the last 14 days</h2><Table list={recent} /></section>
    </div>
  );
}
