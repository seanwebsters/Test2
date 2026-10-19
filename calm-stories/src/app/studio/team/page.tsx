import { getDb } from "@/lib/db";
import { getTeamState } from "@/lib/studio/team";
import { TeamRoom } from "@/components/studio/TeamRoom";
import type { ReviewItem } from "@/components/studio/SimsOffice";
import { isStaff } from "@/app/admin/staff";

export const metadata = { title: "AI Team" };

export default async function TeamPage() {
  if (!(await isStaff())) return null;
  const db = getDb();
  const team = await getTeamState();
  // Team (view-only) logins just watch; the owner also gets the office and animation controls.
  // Review room: finished stories by status, newest first.
  const [episodes, series] = await Promise.all([db.list("episodes", { where: { status: ["in_review", "changes_requested", "approved"] } }), db.list("series")]);
  const order = { in_review: 0, changes_requested: 1, approved: 2 } as const;
  const review: ReviewItem[] = episodes
    .sort((a, b) => order[a.status as keyof typeof order] - order[b.status as keyof typeof order] || (a.updated_at < b.updated_at ? 1 : -1))
    .map((ep) => {
      const s = series.find((x) => x.id === ep.series_id);
      return { id: ep.id, title: ep.title, series: s?.title ?? "", cover: ep.artwork_url ?? s?.artwork.image_url ?? null, status: ep.status as ReviewItem["status"] };
    });
  return (
    <div className="space-y-4">
      <h1 className="sr-only">AI Team</h1>
      <TeamRoom initial={team} review={review} />
    </div>
  );
}
