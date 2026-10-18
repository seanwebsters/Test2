import Link from "next/link";
import { catalog, isReleased, releaseTime } from "@/lib/catalog";
import { now } from "@/lib/clock";
import { getStore } from "@/lib/db";

export const metadata = { title: "Stories" };

export default async function StudioStories() {
  const state = getStore().read();
  const at = now();
  const idx = catalog(state);
  const started = new Map<string, number>();
  for (const e of state.events) if (e.name === "episode_started" && typeof e.props?.episodeId === "string") started.set(e.props.episodeId, (started.get(e.props.episodeId) ?? 0) + 1);
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">Stories</h1>
      <p className="mt-1 text-sm text-bone-3">Every episode on the platform with live engagement. Add episodes to Studio universes from the universe editor.</p>
      {idx.universes.map((u) => (
        <section key={u.id} className="mt-6">
          <h2 className="font-bold"><Link href={`/studio/universes/${u.id}`} className="hover:underline">{u.title}</Link> <span className="text-sm font-normal text-bone-4">· {u.status}</span></h2>
          <div className="mt-2 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-bone-4"><tr><th className="p-2">Ep</th><th>Title</th><th>Access</th><th>Release</th><th className="text-right">Words</th><th className="text-right">Starts</th><th className="p-2 text-right">Completions</th></tr></thead>
              <tbody>
                {u.episodes.map((e) => (
                  <tr key={e.id} className="border-t border-white/5">
                    <td className="p-2 text-bone-4">S{e.season}E{e.number}</td>
                    <td><Link href={`/stories/${e.id}`} className="hover:underline">{e.title}</Link></td>
                    <td className="text-bone-3">{e.access.type}</td>
                    <td className="text-bone-3">{isReleased(idx, e.releaseOffsetDays, at) ? "Live" : new Date(releaseTime(idx, e.releaseOffsetDays)).toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td className="text-right tabular-nums">{e.body.join(" ").split(/\s+/).length}</td>
                    <td className="text-right tabular-nums">{started.get(e.id) ?? 0}</td>
                    <td className="p-2 text-right tabular-nums">{state.storyProgress.filter((p) => p.episodeId === e.id && p.completedAt).length}</td>
                  </tr>
                ))}
                {!u.episodes.length && <tr><td colSpan={7} className="p-3 text-bone-4">No episodes yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
