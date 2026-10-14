"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SceneArt } from "@/components/art/SceneArt";
import { EditableText, ListEditor } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { GENRES, type ScriptSettings, type ScriptVersion } from "@/lib/types";
import { cx, formatDateTime, formatMinutes, relativeTime } from "@/lib/util";
import { api, type Workspace, type WsEpisode } from "./api";

export type Act = (tool: string, input: unknown, opts?: { confirm?: { title: string; body?: string; danger?: boolean; confirmLabel?: string }; quiet?: boolean }) => Promise<boolean>;

export type Section = "overview" | "world" | "characters" | "relationships" | "seasons" | "episodes" | "script" | "audio" | "artwork" | "publishing";

export const SECTIONS: { id: Section; label: string }[] = [
  { id: "overview", label: "Series Overview" },
  { id: "world", label: "World Bible" },
  { id: "characters", label: "Characters" },
  { id: "relationships", label: "Relationships" },
  { id: "seasons", label: "Seasons" },
  { id: "episodes", label: "Episodes" },
  { id: "script", label: "Scripts" },
  { id: "audio", label: "Audio" },
  { id: "artwork", label: "Cover Artwork" },
  { id: "publishing", label: "Publishing" },
];

const STATUS_STYLE: Record<string, string> = {
  planned: "bg-white/5 text-mist",
  draft: "bg-sky-300/10 text-sky-200",
  script_ready: "bg-indigo-300/15 text-indigo-200",
  audio_ready: "bg-violet-300/15 text-violet-200",
  in_review: "bg-amber-300/15 text-amber-200",
  changes_requested: "bg-rose-300/15 text-rose-200",
  approved: "bg-emerald-300/15 text-emerald-200",
  published: "bg-emerald-300/20 text-emerald-100",
  rejected: "bg-rose-400/20 text-rose-100",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={cx("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", STATUS_STYLE[status] ?? "bg-white/5")}>{status.replace("_", " ")}</span>;
}

function H({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="headline text-2xl">{children}</h3>
      {sub && <p className="mt-0.5 text-xs text-mist">{sub}</p>}
    </div>
  );
}

export function SectionPanel({ ws, section, focusId, act, setSection, setFocus }: { ws: Workspace; section: Section; focusId?: string; act: Act; setSection: (s: Section) => void; setFocus: (id?: string) => void }) {
  switch (section) {
    case "overview":
      return <Overview ws={ws} act={act} />;
    case "world":
      return <World ws={ws} act={act} />;
    case "characters":
      return <Characters ws={ws} act={act} focusId={focusId} />;
    case "relationships":
      return <Relationships ws={ws} act={act} />;
    case "seasons":
    case "episodes":
      return <Seasons ws={ws} act={act} focusId={focusId} openScript={(id) => { setFocus(id); setSection("script"); }} />;
    case "script":
      return <ScriptPreview ws={ws} act={act} episodeId={focusId} setFocus={setFocus} />;
    case "audio":
      return <AudioOverview ws={ws} />;
    case "artwork":
      return <Artwork ws={ws} act={act} />;
    case "publishing":
      return <Publishing ws={ws} act={act} />;
  }
}

/* ------------------------------------------------------------------ */

function Overview({ ws, act }: { ws: Workspace; act: Act }) {
  const s = ws.series;
  const save = (patch: Record<string, unknown>) => act("update_series", patch, { quiet: true }).then(() => undefined);
  const written = ws.episodes.filter((e) => e.has_script).length;
  return (
    <div className="space-y-5">
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl ring-1 ring-white/10">
        <SceneArt spec={s.artwork} className="h-full w-full" title={`${s.title} cover`} />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex gap-2"><StatusPill status={s.status} />{s.is_official && <span className="chip">Calm Original</span>}</div>
          <h3 className="headline mt-2 text-3xl leading-none">{s.title}</h3>
          <p className="mt-1 font-serif italic text-white/80">{s.tagline}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="Characters" value={ws.characters.length} />
        <Stat label="Episodes" value={ws.episodes.length} />
        <Stat label="Written" value={written} />
      </div>
      <EditableText label="Title" value={s.title} onSave={(v) => save({ title: v })} />
      <EditableText label="Tagline" value={s.tagline} onSave={(v) => save({ tagline: v })} />
      <EditableText label="Synopsis" value={s.description} onSave={(v) => save({ description: v })} multiline rows={6} />
      <div>
        <label className="label" htmlFor="genre">Genre</label>
        <select id="genre" value={s.genre} onChange={(e) => act("update_series", { genre: e.target.value }, { quiet: true })} className="input">
          {GENRES.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>
      <EditableText label="Tags (comma separated)" value={s.tags.join(", ")} onSave={(v) => save({ tags: v.split(",").map((t) => t.trim()).filter(Boolean) })} />
      {s.status === "published" && (
        <Link href={`/series/${s.slug}`} className="btn-ghost btn-sm">View public page</Link>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] py-3">
      <div className="font-serif text-2xl">{value}</div>
      <div className="text-mist">{label}</div>
    </div>
  );
}

function World({ ws, act }: { ws: Workspace; act: Act }) {
  const b = ws.bible;
  const [newLoc, setNewLoc] = useState({ name: "", description: "" });
  if (!b) return <p className="text-sm text-mist">No Story Bible yet.</p>;
  const save = (patch: Record<string, unknown>) => act("update_world_bible", patch, { quiet: true }).then(() => undefined);
  const empty = !b.geography && !b.culture && !b.rules.length;
  return (
    <div className="space-y-5">
      <H sub="Persistent memory used for every episode.">World Bible</H>
      {empty && (
        <button className="btn-accent btn-sm w-full" onClick={() => act("create_world", {})}>
          <Icon name="sparkle" size={14} /> Generate the World Bible
        </button>
      )}
      <EditableText label="World name" value={b.world_name} onSave={(v) => save({ world_name: v })} />
      <EditableText label="Geography" value={b.geography} onSave={(v) => save({ geography: v })} multiline />
      <EditableText label="Culture" value={b.culture} onSave={(v) => save({ culture: v })} multiline />
      <EditableText label="History" value={b.history} onSave={(v) => save({ history: v })} multiline />
      <EditableText label="Atmosphere" value={b.atmosphere} onSave={(v) => save({ atmosphere: v })} multiline rows={3} />
      <ListEditor label="Rules of the world" items={b.rules} onSave={(rules) => save({ rules })} placeholder="e.g. Magic is always gentle" />
      <ListEditor label="Narrative themes" items={b.themes} onSave={(themes) => save({ themes })} />
      <ListEditor label="Established facts" items={b.established_facts} onSave={(established_facts) => save({ established_facts })} />
      <ListEditor label="Unresolved storylines" items={b.unresolved_threads} onSave={(unresolved_threads) => save({ unresolved_threads })} />
      <ListEditor label="Creator preferences" items={b.creator_preferences} onSave={(creator_preferences) => save({ creator_preferences })} />
      <div>
        <div className="label">Locations</div>
        <ul className="space-y-2">
          {ws.locations.map((l) => (
            <li key={l.id} className="rounded-2xl bg-white/[0.04] p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{l.name} {l.recurring && <span className="ml-1 text-[10px] uppercase tracking-wider text-lavender">recurring</span>}</div>
                  <p className="mt-0.5 text-xs text-mist">{l.description}</p>
                </div>
                <button
                  className="text-xs text-mist hover:text-rose-300"
                  onClick={() => act("delete_location", { location_id: l.id }, { confirm: { title: `Delete ${l.name}?`, body: "This removes it from the Story Bible.", danger: true, confirmLabel: "Delete" } })}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 space-y-2 rounded-2xl border border-dashed border-white/10 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newLoc.name.trim()) return;
            if (await act("add_location", { ...newLoc, recurring: true })) setNewLoc({ name: "", description: "" });
          }}
        >
          <input className="input py-1.5 text-sm" placeholder="New location name" aria-label="New location name" value={newLoc.name} onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })} />
          <input className="input py-1.5 text-sm" placeholder="Short description" aria-label="New location description" value={newLoc.description} onChange={(e) => setNewLoc({ ...newLoc, description: e.target.value })} />
          <button className="btn-ghost btn-sm" type="submit">Add location</button>
        </form>
      </div>
    </div>
  );
}

const CHAR_FIELDS: [keyof Workspace["characters"][number], string, boolean][] = [
  ["name", "Name", false],
  ["age_range", "Age", false],
  ["narrative_role", "Narrative role", false],
  ["personality", "Personality", true],
  ["backstory", "Backstory", true],
  ["motivations", "Motivations", true],
  ["voice_profile", "Voice profile", true],
  ["arc", "Development arc", true],
];

function Characters({ ws, act, focusId }: { ws: Workspace; act: Act; focusId?: string }) {
  const [open, setOpen] = useState<string | null>(focusId ?? ws.characters[0]?.id ?? null);
  const [manual, setManual] = useState({ name: "", narrative_role: "" });
  useEffect(() => {
    if (focusId) setOpen(focusId);
  }, [focusId]);
  return (
    <div className="space-y-4">
      <H sub="Characters stay consistent across every episode.">Characters</H>
      <div className="flex gap-2">
        <button className="btn-accent btn-sm" onClick={() => act("create_character", { count: 1 })}>
          <Icon name="sparkle" size={14} /> Generate a character
        </button>
        {ws.characters.some((c) => !c.backstory) && (
          <button className="btn-ghost btn-sm" onClick={() => act("create_character", { names: ws.characters.filter((c) => !c.backstory).map((c) => c.name).slice(0, 4) })}>
            Develop profiles
          </button>
        )}
      </div>
      <ul className="space-y-3">
        {ws.characters.map((c) => (
          <li key={c.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
            <button className="flex w-full items-center gap-3 p-3 text-left" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10">
                <SceneArt spec={c.portrait} className="h-full w-full" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-serif text-xl leading-tight">{c.name}</span>
                <span className="block truncate text-xs text-mist">{c.narrative_role || "Role not set"} {c.age_range && `· ${c.age_range}`}</span>
              </span>
              <Icon name="chevronDown" size={16} className={cx("text-mist transition", open === c.id && "rotate-180")} />
            </button>
            {open === c.id && (
              <div className="space-y-3 border-t border-white/5 p-3">
                {CHAR_FIELDS.map(([key, label, multi]) => (
                  <EditableText key={key} label={label} value={String(c[key] ?? "")} multiline={multi} rows={3} onSave={(v) => act("update_character", { character_id: c.id, [key]: v }, { quiet: true }).then(() => undefined)} />
                ))}
                <button
                  className="btn-danger btn-sm"
                  onClick={() => act("delete_character", { character_id: c.id }, { confirm: { title: `Delete ${c.name}?`, body: "Their relationships will be removed too. Existing scripts aren't changed.", danger: true, confirmLabel: "Delete character" } })}
                >
                  <Icon name="trash" size={14} /> Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form
        className="space-y-2 rounded-2xl border border-dashed border-white/10 p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!manual.name.trim()) return;
          if (await act("create_character", { profile: { name: manual.name.trim(), narrative_role: manual.narrative_role } })) setManual({ name: "", narrative_role: "" });
        }}
      >
        <div className="label">Add your own character</div>
        <input className="input py-1.5 text-sm" placeholder="Name" aria-label="Character name" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
        <input className="input py-1.5 text-sm" placeholder="Role (e.g. Mentor)" aria-label="Character role" value={manual.narrative_role} onChange={(e) => setManual({ ...manual, narrative_role: e.target.value })} />
        <button className="btn-ghost btn-sm" type="submit">Add character</button>
      </form>
    </div>
  );
}

function Relationships({ ws, act }: { ws: Workspace; act: Act }) {
  const [f, setF] = useState({ a: "", b: "", kind: "", description: "" });
  const name = (id: string) => ws.characters.find((c) => c.id === id)?.name ?? "?";
  return (
    <div className="space-y-4">
      <H sub="How your characters relate to one another.">Relationships</H>
      <ul className="space-y-2">
        {ws.relationships.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-2 rounded-2xl bg-white/[0.04] p-3 text-sm">
            <div>
              <div className="font-medium">{name(r.character_a_id)} <span className="text-lavender">↔</span> {name(r.character_b_id)}</div>
              <div className="text-xs text-lavender">{r.kind}</div>
              <p className="mt-1 text-xs text-mist">{r.description}</p>
            </div>
            <button className="text-xs text-mist hover:text-rose-300" onClick={() => act("delete_relationship", { relationship_id: r.id })}>Remove</button>
          </li>
        ))}
        {ws.relationships.length === 0 && <li className="text-sm text-mist">No relationships recorded yet.</li>}
      </ul>
      {ws.characters.length >= 2 ? (
        <form
          className="space-y-2 rounded-2xl border border-dashed border-white/10 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!f.a || !f.b || !f.kind) return;
            if (await act("add_relationship", { character_a_id: f.a, character_b_id: f.b, kind: f.kind, description: f.description })) setF({ a: "", b: "", kind: "", description: "" });
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            {(["a", "b"] as const).map((k) => (
              <select key={k} className="input py-1.5 text-sm" value={f[k]} aria-label={`Character ${k.toUpperCase()}`} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
                <option value="">Choose…</option>
                {ws.characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ))}
          </div>
          <input className="input py-1.5 text-sm" placeholder="Kind (e.g. old friends, slow-burn romance)" aria-label="Relationship kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} />
          <input className="input py-1.5 text-sm" placeholder="Description" aria-label="Relationship description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <button className="btn-ghost btn-sm" type="submit">Add relationship</button>
        </form>
      ) : (
        <p className="text-xs text-mist">Add at least two characters to record relationships.</p>
      )}
    </div>
  );
}

function Seasons({ ws, act, focusId, openScript }: { ws: Workspace; act: Act; focusId?: string; openScript: (id: string) => void }) {
  const [count, setCount] = useState(10);
  const [seasonNo, setSeasonNo] = useState(ws.seasons[0]?.number ?? 1);
  const [editing, setEditing] = useState<string | null>(null);
  const move = async (seasonId: string, eps: WsEpisode[], i: number, dir: -1 | 1) => {
    const ids = eps.map((e) => e.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    await act("reorder_episodes", { season_id: seasonId, episode_ids: ids }, { quiet: true });
  };
  return (
    <div className="space-y-5">
      <H sub="Plan, rearrange and rewrite your episodes.">Seasons & Episodes</H>
      <form
        className="flex flex-wrap items-end gap-2 rounded-2xl bg-white/[0.03] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void act("generate_season_outline", { season_number: seasonNo, episode_count: count });
        }}
      >
        <label className="text-xs text-mist">Season<input type="number" min={1} max={20} value={seasonNo} onChange={(e) => setSeasonNo(Number(e.target.value))} className="input mt-1 w-20 py-1.5 text-sm" /></label>
        <label className="text-xs text-mist">Episodes<input type="number" min={1} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} className="input mt-1 w-20 py-1.5 text-sm" /></label>
        <button className="btn-accent btn-sm" type="submit"><Icon name="sparkle" size={14} /> Plan season</button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => act("continue_story", {})}>Continue this story</button>
      </form>
      {ws.seasons.map((season) => {
        const eps = ws.episodes.filter((e) => e.season_id === season.id);
        const locked = eps.some((e) => ["published", "approved", "in_review"].includes(e.status));
        return (
          <section key={season.id} aria-labelledby={`season-${season.id}`}>
            <h4 id={`season-${season.id}`} className="font-serif text-xl">Season {season.number} · {season.title}</h4>
            {season.synopsis && <p className="mt-1 text-xs text-mist">{season.synopsis}</p>}
            <ol className="mt-3 space-y-2">
              {eps.map((e, i) => (
                <li key={e.id} className={cx("rounded-2xl border bg-white/[0.02] p-3", focusId === e.id ? "border-lavender/50" : "border-white/10")}>
                  {editing === e.id ? (
                    <div className="space-y-2">
                      <EditableText label="Title" value={e.title} onSave={(v) => act("update_episode", { episode_id: e.id, title: v }, { quiet: true }).then(() => undefined)} />
                      <EditableText label="Summary" value={e.summary} multiline rows={4} onSave={(v) => act("update_episode", { episode_id: e.id, summary: v }, { quiet: true }).then(() => undefined)} />
                      <button className="btn-ghost btn-sm" onClick={() => setEditing(null)}>Done</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <span className="w-6 pt-0.5 text-center font-serif text-lg text-mist">{e.number}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{e.title}</span>
                            <StatusPill status={e.status} />
                          </div>
                          <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-mist">{e.summary}</p>
                          <p className="mt-1 text-[11px] text-mist">
                            {formatMinutes(e.duration_seconds)} {e.has_script && `· ${e.word_count.toLocaleString()} words · v${e.version_count}`}
                            {e.script_simulated && " · simulated draft"}
                          </p>
                        </div>
                        {!locked && (
                          <div className="flex flex-col">
                            <button aria-label="Move up" disabled={i === 0} onClick={() => move(season.id, eps, i, -1)} className="rounded p-0.5 text-mist hover:text-white disabled:opacity-30"><Icon name="chevronDown" size={14} className="rotate-180" /></button>
                            <button aria-label="Move down" disabled={i === eps.length - 1} onClick={() => move(season.id, eps, i, 1)} className="rounded p-0.5 text-mist hover:text-white disabled:opacity-30"><Icon name="chevronDown" size={14} /></button>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 pl-9">
                        <button className="btn-primary btn-sm" onClick={() => (e.has_script ? openScript(e.id) : act("write_episode", { episode_id: e.id }))}>
                          {e.has_script ? "Open script" : "Write Episode"}
                        </button>
                        {!["published", "approved", "in_review"].includes(e.status) && (
                          <>
                            <button className="btn-ghost btn-sm" onClick={() => setEditing(e.id)}>Edit</button>
                            <button className="btn-ghost btn-sm" onClick={() => act("generate_episode_outline", { episode_id: e.id })}>Outline beats</button>
                            <button
                              className="btn-ghost btn-sm"
                              onClick={() => act("delete_episode", { episode_id: e.id }, { confirm: { title: `Delete “${e.title}”?`, body: "All script versions for this episode will be deleted.", danger: true, confirmLabel: "Delete episode" } })}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
              {eps.length === 0 && <li className="text-sm text-mist">No episodes yet – plan the season above.</li>}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

const SETTING_OPTIONS: { key: keyof ScriptSettings; label: string; options: string[] }[] = [
  { key: "mood", label: "Mood", options: ["dreamy", "cosy", "wistful", "wonder", "tender"] },
  { key: "perspective", label: "Perspective", options: ["third", "first", "second"] },
  { key: "style", label: "Writing style", options: ["lyrical", "storybook", "literary", "minimal"] },
  { key: "dialogue", label: "Dialogue", options: ["none", "light", "moderate"] },
  { key: "romance", label: "Romance (sleep-friendly)", options: ["none", "gentle", "warm"] },
  { key: "pacing", label: "Pacing", options: ["very-slow", "slow", "gentle"] },
];

export function ScriptSettingsForm({ value, onChange }: { value: ScriptSettings; onChange: (s: ScriptSettings) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="text-xs text-mist">
        Duration (min)
        <input type="number" min={5} max={90} value={value.duration_minutes} onChange={(e) => onChange({ ...value, duration_minutes: Number(e.target.value) })} className="input mt-1 py-1.5 text-sm" />
      </label>
      {SETTING_OPTIONS.map((o) => (
        <label key={o.key} className="text-xs text-mist">
          {o.label}
          <select value={String(value[o.key])} onChange={(e) => onChange({ ...value, [o.key]: e.target.value } as ScriptSettings)} className="input mt-1 py-1.5 text-sm">
            {o.options.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}

type ScriptData = { episode: WsEpisode; script: { id: string; settings: ScriptSettings } | null; current: ScriptVersion | null; versions: Omit<ScriptVersion, "content">[] };

function ScriptPreview({ ws, act, episodeId, setFocus }: { ws: Workspace; act: Act; episodeId?: string; setFocus: (id?: string) => void }) {
  const epId = episodeId && ws.episodes.some((e) => e.id === episodeId) ? episodeId : (ws.episodes.find((e) => e.has_script) ?? ws.episodes[0])?.id;
  const ep = ws.episodes.find((e) => e.id === epId);
  const [data, setData] = useState<ScriptData | null>(null);
  const [settings, setSettings] = useState<ScriptSettings | null>(null);
  const reloadKey = `${epId}:${ep?.version_count}:${ep?.word_count}`;
  useEffect(() => {
    if (!epId) return;
    let alive = true;
    api<ScriptData>(`/api/storymaker/episodes/${epId}/script`).then((d) => {
      if (!alive) return;
      setData(d);
      setSettings(d.script?.settings ?? { duration_minutes: Math.round((ep?.duration_seconds ?? 1800) / 60), mood: "dreamy", perspective: "third", style: "lyrical", dialogue: "light", romance: "gentle", pacing: "slow" });
    });
    return () => {
      alive = false;
    };
  }, [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ep) return <p className="text-sm text-mist">Plan some episodes first.</p>;
  const locked = ["published", "approved", "in_review"].includes(ep.status);
  return (
    <div className="space-y-4">
      <H sub="Preview, settings and versions. Open the full editor to select passages and rewrite them.">Scripts</H>
      <select className="input" value={ep.id} aria-label="Episode" onChange={(e) => setFocus(e.target.value)}>
        {ws.episodes.map((e) => <option key={e.id} value={e.id}>Ep {e.number} · {e.title}{e.has_script ? " ✓" : ""}</option>)}
      </select>
      {settings && !locked && (
        <details className="rounded-2xl bg-white/[0.03] p-3" open={!ep.has_script}>
          <summary className="cursor-pointer text-sm font-medium">Script settings</summary>
          <div className="mt-3"><ScriptSettingsForm value={settings} onChange={setSettings} /></div>
        </details>
      )}
      <div className="flex flex-wrap gap-2">
        {!locked && (
          <button className="btn-accent btn-sm" onClick={() => act("write_episode", { episode_id: ep.id, settings })}>
            <Icon name="sparkle" size={14} /> {ep.has_script ? "Rewrite episode" : "Write Episode"}
          </button>
        )}
        {ep.has_script && (
          <>
            <Link className="btn-primary btn-sm" href={`/studio/series/${ws.series.id}/episodes/${ep.id}`}>Open editor</Link>
            <button className="btn-ghost btn-sm" onClick={() => act("check_story_continuity", { episode_id: ep.id })}>Check continuity</button>
            {!locked && ep.status !== "script_ready" && ep.status !== "audio_ready" && (
              <button className="btn-ghost btn-sm" onClick={() => act("approve_script", { episode_id: ep.id })}>Approve script</button>
            )}
          </>
        )}
      </div>
      {data?.current ? (
        <article className="max-h-[50vh] overflow-y-auto rounded-3xl bg-night/60 p-5 font-serif text-[1.06rem] leading-relaxed text-white/90 ring-1 ring-white/5">
          {data.current.simulated && <p className="mb-3 rounded-xl bg-amber-300/10 px-3 py-2 font-sans text-xs text-amber-100">Simulated draft – generated without an AI model.</p>}
          {data.current.content.split(/\n\s*\n/).map((p, i) => <p key={i} className="mb-4">{p}</p>)}
        </article>
      ) : (
        <p className="rounded-2xl bg-white/[0.03] p-4 text-sm text-mist">No script yet. Adjust the settings and click Write Episode.</p>
      )}
      {data && data.versions.length > 0 && (
        <div>
          <div className="label">Version history</div>
          <ul className="space-y-1.5 text-xs">
            {data.versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
                <span>
                  <strong>v{v.version}</strong> · {v.source.replace("_", " ")} · {v.word_count.toLocaleString()} words · {relativeTime(v.created_at)}
                  <span className="block text-mist">{v.note}</span>
                </span>
                {v.id !== data.current?.id && !locked && (
                  <button className="text-lavender hover:underline" onClick={() => act("restore_script_version", { version_id: v.id })}>Restore</button>
                )}
                {v.id === data.current?.id && <span className="text-mist">current</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AudioOverview({ ws }: { ws: Workspace }) {
  return (
    <div className="space-y-4">
      <H sub="Narration, ambience and the final mix for each episode.">Audio</H>
      <ul className="space-y-2">
        {ws.episodes.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">Ep {e.number} · {e.title}</div>
              <div className="text-xs text-mist">
                {e.audio ? `${e.audio.kind === "sample" ? "Sample ambience" : "Mixed"} · ${formatMinutes(e.audio.duration_seconds)}${e.audio.simulated && e.audio.kind !== "sample" ? " · simulated narration" : ""}${e.audio.qa_passed === false ? " · QA issues" : ""}` : e.has_script ? "Script ready – no audio yet" : "Needs a script"}
              </div>
            </div>
            <Link className={cx("btn-sm", e.has_script ? "btn-primary" : "btn-ghost pointer-events-none opacity-40")} href={`/studio/production?episode=${e.id}`} aria-disabled={!e.has_script}>
              {e.audio && e.audio.kind !== "sample" ? "Open" : "Produce Audio"}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Artwork({ ws, act }: { ws: Workspace; act: Act }) {
  const [scene, setScene] = useState(ws.series.artwork.scene);
  const [prompt, setPrompt] = useState("");
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("series_id", ws.series.id);
    const res = await fetch("/api/uploads/artwork", { method: "POST", body: form });
    setUploading(false);
    if (res.ok) await act("update_series", {}, { quiet: true });
    else alert(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Upload failed");
  };
  return (
    <div className="space-y-4">
      <H sub="Each series keeps one consistent visual identity.">Cover Artwork</H>
      <div className="relative aspect-[3/4] w-2/3 overflow-hidden rounded-3xl ring-1 ring-white/10">
        <SceneArt spec={ws.series.artwork} className="h-full w-full" title="Current cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night p-4"><div className="headline text-2xl leading-tight">{ws.series.title}</div></div>
      </div>
      <div className="space-y-2 rounded-2xl bg-white/[0.03] p-3">
        <label className="text-xs text-mist">
          Scene
          <select className="input mt-1 py-1.5 text-sm" value={scene} onChange={(e) => setScene(e.target.value as typeof scene)}>
            {["kingdom", "forest", "cabin", "space", "ocean", "garden", "library", "village", "coast", "desert", "aurora", "city", "lake"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <input className="input py-1.5 text-sm" placeholder="Art direction (optional)" aria-label="Art direction" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button className="btn-accent btn-sm" onClick={() => act("generate_cover_art", { scene, prompt: prompt || undefined })}><Icon name="sparkle" size={14} /> Generate cover</button>
          <label className="btn-ghost btn-sm cursor-pointer">
            <Icon name="upload" size={14} /> {uploading ? "Uploading…" : "Upload image"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        </div>
        <p className="text-[11px] text-mist">
          {ws.engine.image.configured ? `Image generation via ${ws.engine.image.provider}.` : "No image provider configured – covers are rendered procedurally in the series palette."} Character portraits and episode art use the same style.
        </p>
      </div>
      {ws.artworks.length > 0 && (
        <div>
          <div className="label">History</div>
          <div className="grid grid-cols-3 gap-2">
            {ws.artworks.slice(0, 9).map((a) => (
              <figure key={a.id} className="overflow-hidden rounded-2xl ring-1 ring-white/10">
                <SceneArt spec={a.spec} className="aspect-[3/4] w-full" />
                <figcaption className="px-2 py-1 text-[10px] text-mist">{a.source} · {relativeTime(a.created_at)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Publishing({ ws, act }: { ws: Workspace; act: Act }) {
  const r = ws.rights;
  const [rights, setRights] = useState({
    original_work: r?.original_work ?? false,
    ai_assisted: r?.ai_assisted ?? true,
    third_party_material: r?.third_party_material ?? "None",
    voice_consent: r?.voice_consent ?? false,
  });
  const [when, setWhen] = useState<Record<string, string>>({});
  const ready = useMemo(
    () =>
      ws.episodes.map((e) => ({
        e,
        steps: [
          { label: "Script", ok: e.has_script },
          { label: "Script approved", ok: ["script_ready", "audio_ready", "in_review", "approved", "published"].includes(e.status) },
          { label: "Audio mix", ok: Boolean(e.audio && e.audio.kind !== "sample") },
          { label: "Rights declared", ok: Boolean(ws.rights) || ws.series.is_official },
        ],
      })),
    [ws],
  );
  return (
    <div className="space-y-5">
      <H sub="Episodes stay private until Calm's editorial team approves them.">Publishing</H>
      <form
        className="space-y-3 rounded-3xl border border-white/10 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void act("save_rights_declaration", rights);
        }}
      >
        <div className="font-medium">Ownership & rights declaration</div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-lavender" checked={rights.original_work} onChange={(e) => setRights({ ...rights, original_work: e.target.checked })} /> This series is my original work and doesn&rsquo;t use copyrighted characters, worlds or music without a licence.</label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-lavender" checked={rights.ai_assisted} onChange={(e) => setRights({ ...rights, ai_assisted: e.target.checked })} /> AI tools assisted with writing or production (shown to listeners as an AI disclosure).</label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-lavender" checked={rights.voice_consent} onChange={(e) => setRights({ ...rights, voice_consent: e.target.checked })} /> I only use Calm-approved voices, and no one&rsquo;s voice is cloned without documented consent.</label>
        <label className="block text-xs text-mist">Third-party material (with licence details)
          <input className="input mt-1 py-1.5 text-sm" value={rights.third_party_material} onChange={(e) => setRights({ ...rights, third_party_material: e.target.value })} />
        </label>
        <button className="btn-primary btn-sm" type="submit" disabled={!rights.original_work}>{r ? "Update declaration" : "Save declaration"}</button>
        {r && <p className="text-[11px] text-mist">Declared {relativeTime(r.created_at)} · terms {r.accepted_terms_version}</p>}
      </form>
      <ul className="space-y-3">
        {ready.map(({ e, steps }) => {
          const canSubmit = steps.every((s) => s.ok) && !["in_review", "approved", "published"].includes(e.status);
          return (
            <li key={e.id} className="rounded-3xl border border-white/10 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Ep {e.number} · {e.title}</span>
                <StatusPill status={e.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {steps.map((s) => (
                  <span key={s.label} className={cx("rounded-full px-2 py-0.5 text-[11px]", s.ok ? "bg-emerald-300/10 text-emerald-200" : "bg-white/5 text-mist")}>
                    {s.ok ? "✓" : "○"} {s.label}
                  </span>
                ))}
              </div>
              {e.review && (
                <p className="mt-2 text-xs text-mist">
                  Review: <strong className="text-white">{e.review.status.replace("_", " ")}</strong>
                  {e.review.notes && e.review.status !== "pending" && <> – “{e.review.notes}”</>}
                </p>
              )}
              {e.release_at && ["approved", "published"].includes(e.status) && <p className="mt-1 text-xs text-mist">Release: {formatDateTime(e.release_at)}</p>}
              {canSubmit && (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="text-xs text-mist">Requested release (optional)
                    <input type="datetime-local" className="input mt-1 py-1.5 text-sm" value={when[e.id] ?? ""} onChange={(ev) => setWhen({ ...when, [e.id]: ev.target.value })} />
                  </label>
                  <button
                    className="btn-accent btn-sm"
                    onClick={() =>
                      act(
                        "submit_for_review",
                        { episode_id: e.id, requested_release_at: when[e.id] ? new Date(when[e.id]!).toISOString() : undefined },
                        { confirm: { title: `Submit “${e.title}” for review?`, body: "Calm's editors will review the script, audio, rights and safety checks. It won't be public until approved.", confirmLabel: "Submit for review" } },
                      )
                    }
                  >
                    Submit for review
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
