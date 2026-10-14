import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { canCreate, canEditSeries } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { SceneArt } from "@/components/art/SceneArt";
import { StatusPill } from "@/components/storymaker/SectionPanels";
import { ProductionStudio } from "./ProductionStudio";

export const metadata = { title: "Audio production" };

export default async function ProductionPage({ searchParams }: { searchParams: Promise<{ episode?: string }> }) {
  const { episode } = await searchParams;
  const viewer = await getViewer();
  if (!viewer.user) redirect("/sign-in?next=/studio/production");
  if (!canCreate(viewer)) redirect("/studio");
  const db = getDb();
  if (episode) {
    const ep = await db.get("episodes", episode);
    const series = ep ? await db.get("series", ep.series_id) : null;
    if (ep && series && canEditSeries(viewer, series)) return <ProductionStudio episodeId={ep.id} />;
  }
  const series = await db.list("series", { where: { creator_id: viewer.user.id } });
  const scripts = series.length ? await db.list("scripts", { where: { series_id: series.map((s) => s.id) } }) : [];
  const withScript = new Set(scripts.filter((s) => s.current_version_id).map((s) => s.episode_id));
  const episodes = series.length ? (await db.list("episodes", { where: { series_id: series.map((s) => s.id) } })).filter((e) => withScript.has(e.id)) : [];
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-8">
      <p className="chip mb-3">Production</p>
      <h1 className="headline text-5xl">Audio production</h1>
      <p className="mt-2 text-mist">Choose an episode with a finished script to narrate, add a soundscape and mix.</p>
      <ul className="mt-8 space-y-3">
        {episodes.map((e) => {
          const s = series.find((x) => x.id === e.series_id)!;
          return (
            <li key={e.id}>
              <Link href={`/studio/production?episode=${e.id}`} className="card flex items-center gap-4 p-4 hover:border-lavender/40">
                <span className="h-16 w-12 overflow-hidden rounded-xl"><SceneArt spec={s.artwork} className="h-full w-full" /></span>
                <span className="flex-1"><span className="block text-xs text-mist">{s.title}</span><span className="font-medium">Ep {e.number} · {e.title}</span></span>
                <StatusPill status={e.status} />
              </Link>
            </li>
          );
        })}
        {episodes.length === 0 && <li className="text-mist">No scripted episodes yet. <Link href="/create" className="text-lavender hover:underline">Write one in Storymaker</Link>.</li>}
      </ul>
    </div>
  );
}
