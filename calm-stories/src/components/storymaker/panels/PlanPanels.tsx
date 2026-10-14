"use client";

import { useState } from "react";
import { Artwork } from "@/components/Artwork";
import type { SceneKind } from "@/lib/types";
import { cx, formatDateTime } from "@/lib/util";
import { useWorkspace } from "../WorkspaceContext";
import { Btn, Empty, Field, PanelHeader, StatusPill, inputCls } from "../ui";

/* ------------------------------------------------------------------ seasons */

export function SeasonsPanel() {
  const { snapshot, act, busy } = useWorkspace();
  const [plan, setPlan] = useState({ count: 6, minutes: 30, brief: "" });
  return (
    <div>
      <PanelHeader title="Seasons" hint="Season arcs and milestones. Episodes progress gently, without cliffhangers." />
      <form
        className="card-surface mb-6 grid gap-3 p-4 sm:grid-cols-[auto_auto_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void act("generate_season_outline", { episode_count: plan.count, duration_minutes: plan.minutes, brief: plan.brief || undefined }, { label: "Planning the season…" });
        }}
      >
        <Field label="Episodes">
          <input type="number" min={1} max={12} value={plan.count} onChange={(e) => setPlan({ ...plan, count: Number(e.target.value) })} className={cx(inputCls, "w-20")} />
        </Field>
        <Field label="Minutes each">
          <select value={plan.minutes} onChange={(e) => setPlan({ ...plan, minutes: Number(e.target.value) })} className={inputCls}>
            {[15, 20, 30, 45].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Direction (optional)">
          <input value={plan.brief} onChange={(e) => setPlan({ ...plan, brief: e.target.value })} placeholder="e.g. winter arrives; the romance stays a slow burn" className={inputCls} />
        </Field>
        <Btn variant="primary" type="submit" disabled={!!busy}>
          Plan a season
        </Btn>
      </form>
      {snapshot!.seasons.length === 0 ? (
        <Empty>No seasons yet.</Empty>
      ) : (
        <ol className="space-y-5">
          {snapshot!.seasons.map((s) => {
            const eps = snapshot!.episodes.filter((e) => e.season_id === s.id);
            return (
              <li key={s.id} className="card-surface p-5">
                <p className="text-xs uppercase tracking-wider text-lavender">Season {s.number}</p>
                <p className="font-serif text-2xl font-semibold">{s.title}</p>
                {s.synopsis && <p className="mt-2 text-sm">{s.synopsis}</p>}
                {s.arc && <p className="mt-2 text-sm text-mist">Arc: {s.arc}</p>}
                <p className="mt-3 text-xs text-mist">{eps.length} episodes</p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ episodes */

export function EpisodesPanel() {
  const { snapshot, act, busy, openEpisode } = useWorkspace();
  const scripted = new Set(snapshot!.scripts.filter((s) => s.current_version_id).map((s) => s.episode_id));
  const [adding, setAdding] = useState({ title: "", summary: "" });
  return (
    <div>
      <PanelHeader title="Episodes" hint="Outline, write and open each episode's script.">
        <Btn variant="primary" disabled={!!busy} onClick={() => act("continue_story", {}, { label: "Thinking about what happens next…" })}>
          Continue this story
        </Btn>
      </PanelHeader>
      {snapshot!.episodes.length === 0 ? (
        <Empty>Plan a season to create episodes, or add one below.</Empty>
      ) : (
        <ol className="space-y-3">
          {snapshot!.episodes.map((e) => {
            const season = snapshot!.seasons.find((s) => s.id === e.season_id);
            const locked = ["in_review", "approved", "published"].includes(e.status);
            return (
              <li key={e.id} className="card-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-mist">
                    S{season?.number ?? 1} · E{e.number}
                  </span>
                  <StatusPill status={e.status} />
                  {e.is_preview && <span className="text-[11px] text-mist">Free preview</span>}
                  {e.release_at && <span className="text-[11px] text-mist">Release requested {formatDateTime(e.release_at)}</span>}
                </div>
                <p className="mt-1 font-serif text-xl font-semibold">{e.title}</p>
                <p className="mt-1 text-sm text-mist">{e.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {scripted.has(e.id) ? (
                    <Btn variant="outline" className="px-3 py-1.5 text-xs" onClick={() => openEpisode(e.id, "scripts")}>
                      Open script
                    </Btn>
                  ) : (
                    <Btn variant="outline" className="px-3 py-1.5 text-xs" disabled={!!busy || locked} onClick={async () => {
                      const r = await act("write_episode", { episode_id: e.id }, { label: `Writing “${e.title}”…` });
                      if (r.ok) openEpisode(e.id, "scripts");
                    }}>
                      Write script
                    </Btn>
                  )}
                  <Btn className="px-3 py-1.5 text-xs" disabled={!!busy || locked} onClick={() => act("generate_episode_outline", { episode_id: e.id }, { label: "Outlining…" })}>
                    Outline beats
                  </Btn>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <form
        className="mt-6 space-y-2"
        onSubmit={async (ev) => {
          ev.preventDefault();
          const r = await act("add_episode", adding, { label: "Adding…" });
          if (r.ok) setAdding({ title: "", summary: "" });
        }}
      >
        <h3 className="font-serif text-xl font-semibold">Add an episode</h3>
        <input required placeholder="Title" value={adding.title} onChange={(e) => setAdding({ ...adding, title: e.target.value })} className={inputCls} aria-label="Episode title" />
        <textarea placeholder="One or two sentences on what happens" rows={2} value={adding.summary} onChange={(e) => setAdding({ ...adding, summary: e.target.value })} className={inputCls} aria-label="Episode summary" />
        <Btn variant="outline" type="submit" disabled={!!busy}>
          Add episode
        </Btn>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ cover */

const SCENES: SceneKind[] = ["kingdom", "forest", "cabin", "space", "ocean", "garden", "library", "village", "coast", "desert", "aurora", "city", "lake"];
const PALETTE_NAMES = ["moon", "forest", "ember", "space", "sea", "rose", "aurora", "dusk", "sand", "snow"];

export function CoverPanel() {
  const { snapshot, act, busy } = useWorkspace();
  const s = snapshot!.series;
  const [scene, setScene] = useState<SceneKind | "">("");
  const [palette, setPalette] = useState("");
  return (
    <div>
      <PanelHeader title="Cover Artwork" hint="Illustrated key art generated from your world. Every variation is kept in your asset history." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-3xl shadow-card">
          <Artwork spec={s.artwork} title={s.title} className="h-full w-full" />
        </div>
        <div className="space-y-4">
          <div className="aspect-[16/7] overflow-hidden rounded-3xl">
            <Artwork spec={s.artwork} title={s.title} variant="hero" className="h-full w-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Scene">
              <select value={scene} onChange={(e) => setScene(e.target.value as SceneKind | "")} className={inputCls}>
                <option value="">Keep current ({s.artwork.scene})</option>
                {SCENES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Palette">
              <select value={palette} onChange={(e) => setPalette(e.target.value)} className={inputCls}>
                <option value="">Surprise me</option>
                {PALETTE_NAMES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
          </div>
          <Btn variant="primary" disabled={!!busy} onClick={() => act("generate_cover_art", { scene: scene || undefined, palette: palette || undefined }, { label: "Painting…" })}>
            Generate new artwork
          </Btn>
          <p className="text-xs text-mist">Artwork is procedurally illustrated in-app. An image-generation provider can replace it; see docs/INTEGRATIONS.md.</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ publishing */

export function PublishingPanel() {
  const { snapshot, act, busy, api, refresh, notify } = useWorkspace();
  const snap = snapshot!;
  const [rights, setRights] = useState({
    original_work: snap.rights?.original_work ?? false,
    ai_assisted: snap.rights?.ai_assisted ?? true,
    third_party_material: snap.rights?.third_party_material ?? "",
    voice_consent: snap.rights?.voice_consent ?? false,
  });
  const [when, setWhen] = useState<Record<string, string>>({});
  const scripted = new Set(snap.scripts.filter((s) => s.current_version_id).map((s) => s.episode_id));
  return (
    <div>
      <PanelHeader title="Publishing" hint="Every episode is reviewed by Calm's editors before it's public. Releases happen at the scheduled time only after approval." />
      <section className="card-surface p-5">
        <h3 className="font-serif text-xl font-semibold">Rights & disclosure</h3>
        <p className="mt-1 text-sm text-mist">{snap.rights ? `Declared on ${formatDateTime(snap.rights.created_at)} (terms ${snap.rights.accepted_terms_version}).` : "Required before you can submit."}</p>
        <form
          className="mt-4 space-y-3 text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api(`/api/storymaker/series/${snap.series.id}/rights`, { method: "POST", body: JSON.stringify(rights) });
              await refresh();
              notify("Rights declaration saved.");
            } catch (err) {
              notify(err instanceof Error ? err.message : "Could not save");
            }
          }}
        >
          {(
            [
              ["original_work", "This is my original work (or I hold all rights to it). It contains no copyrighted characters, worlds or lyrics."],
              ["ai_assisted", "AI tools helped create this series. It will carry an AI-assistance disclosure."],
              ["voice_consent", "Every narrator voice used is a licensed library voice or my own, with consent. No one's voice is cloned without permission."],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex items-start gap-3">
              <input type="checkbox" checked={rights[k]} onChange={(e) => setRights({ ...rights, [k]: e.target.checked })} className="mt-1 h-4 w-4 accent-lavender" />
              <span>{label}</span>
            </label>
          ))}
          <Field label="Third-party material (if any)">
            <input value={rights.third_party_material} onChange={(e) => setRights({ ...rights, third_party_material: e.target.value })} placeholder="e.g. public-domain folk tune" className={inputCls} />
          </Field>
          <Btn variant="primary" type="submit">
            {snap.rights ? "Update declaration" : "Save declaration"}
          </Btn>
        </form>
      </section>

      <h3 className="mt-8 font-serif text-2xl font-semibold">Episodes</h3>
      <ul className="mt-3 space-y-3">
        {snap.episodes.map((e) => {
          const review = snap.reviews.find((r) => r.episode_id === e.id);
          const canSubmit = scripted.has(e.id) && ["script_ready", "audio_ready", "changes_requested", "draft"].includes(e.status);
          return (
            <li key={e.id} className="card-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">
                  {e.number}. {e.title}
                </p>
                <StatusPill status={e.status} />
              </div>
              {review && (
                <div className="mt-3 rounded-2xl bg-white/[0.04] p-3 text-xs">
                  <p className="text-mist">
                    Review {review.status.replace("_", " ")} · submitted {formatDateTime(review.created_at)}
                    {review.notes && review.status !== "pending" ? ` · Editor: ${review.notes}` : ""}
                  </p>
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {review.checks.map((c) => (
                      <li key={c.name} className="flex items-start gap-2" title={c.detail}>
                        <span className={cx("mt-1 h-2 w-2 shrink-0 rounded-full", c.status === "pass" ? "bg-emerald-300" : c.status === "warn" ? "bg-amber-300" : c.status === "fail" ? "bg-rose-300" : "bg-white/30")} />
                        <span className="capitalize">{c.name.replace(/_/g, " ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Btn variant="primary" className="px-3 py-1.5 text-xs" disabled={!!busy || !canSubmit} onClick={() => act("submit_for_review", { episode_id: e.id, requested_release_at: when[e.id] ? new Date(when[e.id]!).toISOString() : undefined })}>
                  Submit for review
                </Btn>
                <label className="text-xs text-mist">
                  <span className="sr-only">Requested release</span>
                  <input type="datetime-local" value={when[e.id] ?? ""} onChange={(ev) => setWhen({ ...when, [e.id]: ev.target.value })} className={cx(inputCls, "py-1.5 text-xs")} />
                </label>
                <Btn variant="outline" className="px-3 py-1.5 text-xs" disabled={!!busy || !when[e.id] || e.status === "published"} onClick={() => act("schedule_episode", { episode_id: e.id, release_at: new Date(when[e.id]!).toISOString() })}>
                  Request release time
                </Btn>
              </div>
              {!scripted.has(e.id) && <p className="mt-2 text-xs text-mist">Write a script before submitting.</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
