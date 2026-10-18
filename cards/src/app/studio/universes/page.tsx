import Link from "next/link";
import { AdminAction } from "@/components/studio/AdminAction";
import { btn } from "@/components/ui/styles";
import { catalog, isLive } from "@/lib/catalog";
import { now } from "@/lib/clock";
import { getStore } from "@/lib/db";

export const metadata = { title: "Universes" };

const STATUS_COLOR: Record<string, string> = { published: "text-uncommon", review: "text-amber-300", draft: "text-bone-3", unpublished: "text-red-300" };

export default async function StudioUniverses() {
  const state = getStore().read();
  const at = now();
  const idx = catalog(state);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Universes</h1>
        <div className="flex gap-2">
          <Link href="/studio/universes/new" className={btn("glass", "sm")}>Create manually</Link>
          <Link href="/studio/generate" className={btn("primary", "sm")}>Generate with AI Studio</Link>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-bone-4">
            <tr><th className="p-3">Universe</th><th>Source</th><th>Status</th><th className="text-right">Cards</th><th className="text-right">Episodes</th><th className="text-right">Follows</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {idx.universes.map((u) => (
              <tr key={u.id} className="border-t border-white/5">
                <td className="p-3">
                  <Link href={`/studio/universes/${u.id}`} className="font-semibold hover:underline">{u.title}</Link>
                  <p className="text-[12px] text-bone-4">{u.tagline}</p>
                </td>
                <td className="text-bone-3">{u.source === "seed" ? "Launch slate" : "Studio"}</td>
                <td className={STATUS_COLOR[u.status]}>{u.status}{u.status === "published" && !isLive(idx, u, at) ? " (scheduled)" : ""}{u.editorial.featured ? " · featured" : ""}</td>
                <td className="text-right tabular-nums">{u.cards.length}</td>
                <td className="text-right tabular-nums">{u.episodes.length}</td>
                <td className="text-right tabular-nums">{state.follows.filter((f) => f.universeId === u.id).length}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    {u.status === "published" ? (
                      <AdminAction url="/api/studio/universe/status" body={{ universeId: u.id, status: "unpublished" }} label="Unpublish" confirm={`Unpublish ${u.title}? It disappears from discovery; collections are kept.`} />
                    ) : (
                      <AdminAction url="/api/studio/universe/status" body={{ universeId: u.id, status: "published" }} label="Publish" kind="primary" />
                    )}
                    <Link href={`/universes/${u.slug}`} className={btn("ghost", "sm")}>View</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
