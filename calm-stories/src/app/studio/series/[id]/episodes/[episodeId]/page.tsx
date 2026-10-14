import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { canEditSeries } from "@/lib/auth/policy";
import { getDb } from "@/lib/db";
import { loadScript } from "@/lib/storymaker/workspace";
import { resolveWriter } from "@/lib/ai";
import { ScriptEditor } from "./ScriptEditor";

export const metadata = { title: "Episode editor" };

export default async function EpisodeEditorPage({ params }: { params: Promise<{ id: string; episodeId: string }> }) {
  const { id, episodeId } = await params;
  const viewer = await getViewer();
  if (!viewer.user) redirect(`/sign-in?next=/studio/series/${id}/episodes/${episodeId}`);
  const db = getDb();
  const series = await db.get("series", id);
  if (!series || !canEditSeries(viewer, series)) notFound();
  const ep = await db.get("episodes", episodeId);
  if (!ep || ep.series_id !== id) notFound();
  const data = await loadScript(viewer, episodeId);
  const writer = await resolveWriter("rewrite");
  return (
    <ScriptEditor
      series={{ id: series.id, title: series.title, artwork: series.artwork }}
      episode={{ id: ep.id, number: ep.number, title: ep.title, summary: ep.summary, status: ep.status }}
      initial={{ content: data.current?.content ?? "", versionId: data.current?.id ?? null, simulated: data.current?.simulated ?? false }}
      settings={data.script?.settings ?? null}
      versions={data.versions}
      engine={{ simulated: writer.simulated, label: writer.simulated ? "Simulated" : `${writer.providerName} · ${writer.model}` }}
    />
  );
}
