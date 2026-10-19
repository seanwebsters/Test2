import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getViewer } from "@/lib/auth/session";
import { isEditor } from "@/lib/auth/policy";
import { getTeamState } from "@/lib/studio/team";
import { AGENT_BY_KEY } from "@/lib/studio/agents";
import type { ReviewItem } from "@/components/studio/SimsOffice";
import { StudioHome, type InboxCard, type ActivityRow, type LatestCard } from "@/components/studio/StudioHome";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, readAccess } from "@/lib/auth/studio-access";
import "@/lib/studio";

export const metadata = { title: "Studio · Sleep Stories" };
export const dynamic = "force-dynamic";

/** The shared studio home: the live 3D office, your inbox and recent activity. Everything else is Sean access only. */
export default async function OfficePage() {
  const viewer = await getViewer();
  if (!viewer.user || !isEditor(viewer)) redirect("/studio-login?next=/office");
  const db = getDb();
  const [team, allEpisodes, series, events, assets] = await Promise.all([
    getTeamState(),
    db.list("episodes", { orderBy: { column: "updated_at", ascending: false }, limit: 200 }),
    db.list("series"),
    db.list("workflow_events", { orderBy: { column: "created_at", ascending: false }, limit: 60 }),
    db.list("audio_assets"),
  ]);
  const role = readAccess((await cookies()).get(ACCESS_COOKIE)?.value);
  const cover = (seriesId: string, ep?: { artwork_url: string | null }) => ep?.artwork_url ?? series.find((s) => s.id === seriesId)?.artwork.image_url ?? null;
  const episodes = allEpisodes.filter((e) => ["in_review", "changes_requested", "approved"].includes(e.status));
  const duration = (ep: (typeof allEpisodes)[number]) => Math.round(assets.find((a) => a.id === ep.audio_asset_id)?.duration_seconds ?? ep.duration_seconds ?? 0);
  const STAGE: Record<string, LatestCard["stage"]> = { draft: "production", in_review: "ready", changes_requested: "changes", approved: "approved", published: "published", rejected: "production" };
  const latest: LatestCard[] = allEpisodes
    .filter((e) => e.status !== "rejected")
    .slice(0, 12)
    .map((ep) => ({ id: ep.id, title: ep.title, number: ep.number, cover: cover(ep.series_id, ep), stage: ep.status === "draft" && ep.audio_asset_id ? "audio" : STAGE[ep.status]!, seconds: duration(ep) }));
  const order = { in_review: 0, changes_requested: 1, approved: 2 } as const;
  const review: ReviewItem[] = [...episodes]
    .sort((a, b) => order[a.status as keyof typeof order] - order[b.status as keyof typeof order] || (a.updated_at < b.updated_at ? 1 : -1))
    .map((ep) => ({ id: ep.id, title: ep.title, series: series.find((s) => s.id === ep.series_id)?.title ?? "", cover: cover(ep.series_id, ep), status: ep.status as ReviewItem["status"] }));

  const inbox: InboxCard[] = [
    ...episodes
      .filter((ep) => ep.status === "in_review")
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .map((ep) => ({
        id: ep.id,
        kind: "approval" as const,
        title: ep.title,
        seconds: duration(ep),
        sub: `Episode ${ep.number} · ${[ep.audio_asset_id ? "Audio" : null, cover(ep.series_id, ep) ? "artwork" : null].filter(Boolean).join(" + ") || series.find((s) => s.id === ep.series_id)?.title || ""}`,
        cover: cover(ep.series_id, ep),
        since: ep.updated_at,
        href: "/studio/releases",
        cta: "Review story",
      })),
    ...team
      .filter((a) => a.activity === "asking_for_help" && a.task?.kind === "blocked")
      .map((a) => ({
        id: `${a.key}-${a.task?.step_key}`,
        kind: "question" as const,
        title: a.task?.label ?? "A question",
        sub: `${AGENT_BY_KEY[a.key].name} needs your input${a.needs ? `: ${a.needs}` : "."}`,
        cover: null,
        seconds: 0,
        since: a.task?.since ?? "",
        href: `/studio/pipeline?run=${a.task?.run_id ?? ""}`,
        cta: "View options",
      })),
  ];

  const verb: Record<string, string> = { completed: "finished", handoff: "handed over", blocked: "is stuck on", approval: "asked you about", log: "is working on" };
  const activity: ActivityRow[] = events
    .filter((e) => e.agent && e.kind !== "log")
    .slice(0, 6)
    .map((e) => ({ id: e.id, text: `${AGENT_BY_KEY[e.agent!]?.name ?? e.agent} ${verb[e.kind] ?? ""} ${e.message.replace(/^[A-Z][a-z]+ /, (m) => m.toLowerCase())}`.replace(/\s+/g, " ").slice(0, 70), since: e.created_at, tone: e.kind === "completed" ? "done" : e.kind === "blocked" ? "warn" : "info" }));

  return <StudioHome initial={team} review={review} inbox={inbox} activity={activity} latest={latest} isOwner={role === "owner"} />;
}
