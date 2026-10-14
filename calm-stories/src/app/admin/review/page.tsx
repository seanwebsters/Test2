import { getDb } from "@/lib/db";
import { ReviewQueue, type ReviewItem } from "@/components/admin/ReviewQueue";

export const metadata = { title: "Editorial review" };

export default async function ReviewPage() {
  const db = getDb();
  const [pending, decided, users] = await Promise.all([
    db.list("editorial_reviews", { where: { status: "pending" }, orderBy: { column: "created_at" } }),
    db.list("editorial_reviews", { orderBy: { column: "decided_at", ascending: false } }),
    db.list("users"),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const items: ReviewItem[] = [];
  for (const r of pending) {
    const [ep, series, script] = await Promise.all([db.get("episodes", r.episode_id), db.get("series", r.series_id), db.findOne("scripts", { episode_id: r.episode_id })]);
    if (!ep || !series) continue;
    const version = script?.current_version_id ? await db.get("script_versions", script.current_version_id) : null;
    const asset = ep.audio_asset_id ? await db.get("audio_assets", ep.audio_asset_id) : null;
    const rights = await db.findOne("rights_declarations", { series_id: series.id });
    items.push({
      id: r.id,
      episodeId: ep.id,
      episodeTitle: ep.title,
      episodeNumber: ep.number,
      summary: ep.summary,
      seriesTitle: series.title,
      official: series.is_official,
      source: r.source,
      submittedBy: userById.get(r.submitted_by)?.display_name ?? "Unknown",
      submittedAt: r.created_at,
      requestedReleaseAt: r.requested_release_at ?? ep.release_at,
      notes: r.notes,
      checks: r.checks,
      script: version ? { content: version.content, words: version.word_count, version: version.version, simulated: version.simulated, provider: version.provider, model: version.model } : null,
      audio: asset ? { id: asset.id, duration: asset.duration_seconds, simulated: asset.simulated, qaPassed: asset.qa?.passed ?? null } : null,
      rights: rights ? { original: rights.original_work, aiAssisted: rights.ai_assisted, thirdParty: rights.third_party_material } : null,
    });
  }
  const history = decided
    .filter((r) => r.status !== "pending")
    .slice(0, 12)
    .map((r) => ({ id: r.id, status: r.status, decidedAt: r.decided_at ?? r.created_at, notes: r.notes, reviewer: userById.get(r.reviewer_id ?? "")?.display_name ?? "Editor", episodeId: r.episode_id }));
  const epTitles = new Map((await db.list("episodes")).map((e) => [e.id, e.title]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-4xl font-semibold">Editorial review</h1>
        <p className="mt-1 text-sm text-mist">Nothing reaches listeners until it is approved here. Approved episodes go live at their release time.</p>
      </header>
      <ReviewQueue items={items} />
      <section>
        <h2 className="font-serif text-2xl font-semibold">Recent decisions</h2>
        <ul className="mt-3 divide-y divide-white/5 text-sm">
          {history.map((h) => (
            <li key={h.id} className="flex flex-wrap gap-2 py-2">
              <span className="font-medium">{epTitles.get(h.episodeId) ?? "Episode"}</span>
              <span className="text-mist">{h.status.replace(/_/g, " ")} by {h.reviewer}</span>
              {h.notes && <span className="w-full text-xs text-mist">“{h.notes}”</span>}
            </li>
          ))}
          {!history.length && <li className="py-2 text-mist">No decisions yet.</li>}
        </ul>
      </section>
    </div>
  );
}
