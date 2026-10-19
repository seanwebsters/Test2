import Link from "next/link";
import { getDb } from "@/lib/db";
import { AdminAction } from "@/components/admin/AdminAction";
import type { ArtworkKind } from "@/lib/types";
import { cx, relativeTime } from "@/lib/util";
import { isStaff } from "@/app/admin/staff";

export const metadata = { title: "Art Studio" };

const KINDS: { kind: ArtworkKind; label: string; aspect: string }[] = [
  { kind: "poster", label: "Posters", aspect: "aspect-[2/3]" },
  { kind: "character_portrait", label: "Character portraits", aspect: "aspect-[3/4]" },
  { kind: "episode_cover", label: "Episode covers", aspect: "aspect-video" },
  { kind: "environment", label: "Environments", aspect: "aspect-video" },
  { kind: "social", label: "Social", aspect: "aspect-square" },
  { kind: "promo", label: "Promo", aspect: "aspect-[9/16]" },
];

export default async function ArtStudio({ searchParams }: { searchParams: Promise<{ series?: string }> }) {
  if (!(await isStaff())) return null;
  const { series: sel } = await searchParams;
  const db = getDb();
  const projects = await db.list("series_projects");
  const seriesIds = projects.map((p) => p.series_id).filter(Boolean) as string[];
  const series = seriesIds.length ? await db.list("series", { where: { id: seriesIds } }) : [];
  const current = series.find((s) => s.id === sel) ?? series[0];
  const art = current ? await db.list("artwork_assets", { where: { series_id: current.id }, orderBy: { column: "created_at", ascending: false } }) : [];
  const chars = current ? await db.list("characters", { where: { series_id: current.id } }) : [];
  const episodes = current ? await db.list("episodes", { where: { series_id: current.id } }) : [];
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end gap-4">
        <h1 className="font-serif text-5xl text-white">Art Studio</h1>
        {current && <AdminAction endpoint="/api/studio/promo" body={{ series_id: current.id }} label="Create environments & promo pack" pendingLabel="Commissioning…" className="btn-ghost btn-sm ml-auto" />}
      </header>
      <nav className="flex flex-wrap gap-2">
        {series.map((s) => <Link key={s.id} href={`?series=${s.id}`} className={cx("rounded-full px-3 py-1.5 text-sm", s.id === current?.id ? "bg-white text-night" : "bg-white/5 text-mist")}>{s.title}</Link>)}
      </nav>
      {!current && <p className="text-mist">No studio series yet.</p>}
      {current &&
        KINDS.map(({ kind, label, aspect }) => {
          const items = art.filter((a) => a.kind === kind);
          if (!items.length) return null;
          return (
            <section key={kind}>
              <h2 className="font-serif text-3xl text-white">{label}</h2>
              <ul className={cx("mt-4 grid gap-4", kind === "poster" || kind === "character_portrait" || kind === "promo" ? "grid-cols-2 md:grid-cols-4 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-3")}>
                {items.map((a) => {
                  const who = a.character_id ? chars.find((c) => c.id === a.character_id)?.name : a.episode_id ? `Ep ${episodes.find((e) => e.id === a.episode_id)?.number}` : null;
                  return (
                    <li key={a.id} className={cx("overflow-hidden rounded-2xl border bg-white/[0.03]", a.status === "approved" ? "border-emerald-300/60" : a.status === "selected" ? "border-lavender/60" : a.status === "rejected" ? "border-rose-300/30 opacity-60" : "border-white/10")}>
                      <a href={a.variants.titled ?? a.url} target="_blank" rel="noreferrer"><img src={a.variants.titled ?? a.variants["600w"] ?? a.url} alt={`${label} ${who ?? ""}`} className={cx("w-full object-cover", aspect)} loading="lazy" /></a>
                      <div className="space-y-1.5 p-3 text-xs">
                        <div className="flex justify-between gap-2"><span className="text-white">{who ?? a.status}</span><span className="text-mist">{a.status} · {relativeTime(a.created_at)}</span></div>
                        {a.review && (
                          <>
                            {a.review.strengths.slice(0, 1).map((s, i) => <p key={i} className="text-emerald-200/90">+ {s}</p>)}
                            {a.review.issues.slice(0, 2).map((s, i) => <p key={i} className="text-amber-200/90">– {s.issue}</p>)}
                          </>
                        )}
                        <details><summary className="cursor-pointer text-mist">Prompt</summary><p className="mt-1 text-mist">{a.prompt}</p></details>
                        <p className="text-mist">{a.width}×{a.height} · {Object.keys(a.variants).join(", ") || "original"} · {a.model}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {a.status !== "approved" && <AdminAction endpoint={`/api/studio/artwork/${a.id}`} body={{ action: "approve" }} label="Approve" className="btn-ghost btn-sm" />}
                          {a.status === "concept" && ["poster", "episode_cover", "character_portrait"].includes(a.kind) && <AdminAction endpoint={`/api/studio/artwork/${a.id}`} body={{ action: "use" }} label="Use this" className="btn-ghost btn-sm" />}
                          {a.status !== "rejected" && <AdminAction endpoint={`/api/studio/artwork/${a.id}`} body={{ action: "reject" }} label="Reject" className="btn-ghost btn-sm" />}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      {current && !art.length && <p className="text-mist">No artwork yet – the Art Director paints posters and portraits during series development.</p>}
    </div>
  );
}
