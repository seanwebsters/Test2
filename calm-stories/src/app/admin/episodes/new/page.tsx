import { isStaff } from "../../staff";
import { getDb } from "@/lib/db";
import { AddEpisodeForm } from "./AddEpisodeForm";

export const metadata = { title: "Add episode" };

export default async function AddEpisodePage({ searchParams }: { searchParams: Promise<{ series?: string }> }) {
  if (!(await isStaff())) return null;
  const { series: preselect } = await searchParams;
  const db = getDb();
  const [series, seasons, episodes] = await Promise.all([db.list("series", { orderBy: { column: "title" } }), db.list("seasons"), db.list("episodes")]);
  const options = series
    .filter((s) => s.status !== "removed")
    .map((s) => {
      const ss = seasons.filter((x) => x.series_id === s.id).sort((a, b) => a.number - b.number);
      return {
        id: s.id,
        title: s.title,
        seasons: ss.map((x) => ({ number: x.number, title: x.title, episodes: episodes.filter((e) => e.season_id === x.id).length })),
      };
    });
  return (
    <div className="max-w-3xl">
      <h2 className="headline text-3xl">Add an episode</h2>
      <p className="mt-1 text-sm text-mist">Upload the finished episode audio. It goes to the review queue and only becomes public after approval, at its release time.</p>
      <AddEpisodeForm series={options} preselect={preselect ?? null} />
    </div>
  );
}
