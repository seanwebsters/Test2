"use client";

import { useEffect, useState } from "react";
import { Artwork } from "@/components/Artwork";
import { GENRES, type Character, type StoryBible } from "@/lib/types";
import { useWorkspace } from "../WorkspaceContext";
import { Btn, Empty, Field, LinesField, PanelHeader, inputCls } from "../ui";

/* ------------------------------------------------------------------ overview */

export function OverviewPanel() {
  const { snapshot, act, busy, setSection } = useWorkspace();
  const s = snapshot!.series;
  const [draft, setDraft] = useState({ title: s.title, tagline: s.tagline, description: s.description, genre: s.genre, tags: s.tags.join(", ") });
  useEffect(() => setDraft({ title: s.title, tagline: s.tagline, description: s.description, genre: s.genre, tags: s.tags.join(", ") }), [s]);
  const dirty = draft.title !== s.title || draft.tagline !== s.tagline || draft.description !== s.description || draft.genre !== s.genre || draft.tags !== s.tags.join(", ");
  const scripted = snapshot!.scripts.filter((x) => x.current_version_id).length;
  return (
    <div>
      <div className="relative mb-6 aspect-[16/7] overflow-hidden rounded-3xl">
        <Artwork spec={s.artwork} title={s.title} variant="hero" className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5">
          <p className="text-xs uppercase tracking-wider text-lavender">
            {s.genre} · {s.status.replace("_", " ")} · {s.is_official ? "Calm Original" : "Community"}
          </p>
          <p className="font-serif text-3xl font-semibold leading-tight">{s.title}</p>
        </div>
      </div>
      <dl className="mb-6 grid grid-cols-4 gap-3 text-center">
        {[
          ["Characters", snapshot!.characters.length],
          ["Locations", snapshot!.locations.length],
          ["Episodes", snapshot!.episodes.length],
          ["Scripts", scripted],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white/[0.04] py-3">
            <dd className="font-serif text-2xl font-semibold">{v}</dd>
            <dt className="text-[11px] text-mist">{k}</dt>
          </div>
        ))}
      </dl>
      <div className="space-y-4">
        <Field label="Title">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} maxLength={120} />
        </Field>
        <Field label="Tagline">
          <input value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} className={inputCls} maxLength={200} />
        </Field>
        <Field label="Synopsis">
          <textarea rows={5} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={inputCls} maxLength={2000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Genre">
            <select value={draft.genre} onChange={(e) => setDraft({ ...draft, genre: e.target.value as typeof draft.genre })} className={inputCls}>
              {GENRES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Tags" hint="Comma separated">
            <input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn
            variant="primary"
            disabled={!dirty || !!busy}
            onClick={() => act("update_series", { title: draft.title, tagline: draft.tagline, description: draft.description, genre: draft.genre, tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean) }, { label: "Saving…" })}
          >
            Save changes
          </Btn>
          <Btn variant="outline" disabled={!!busy} onClick={() => act("generate_synopsis", {}, { label: "Writing synopsis…" })}>
            Refresh synopsis with AI
          </Btn>
          <Btn onClick={() => setSection("cover")}>Change cover</Btn>
        </div>
        {s.ai_disclosure && <p className="text-xs text-mist">AI disclosure shown to listeners: “{s.ai_disclosure}”</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ world */

export function WorldPanel() {
  const { snapshot, act, busy } = useWorkspace();
  const bible = snapshot!.bible;
  const empty: Omit<StoryBible, "id" | "series_id" | "updated_at"> = { world_name: "", geography: "", culture: "", history: "", atmosphere: "", rules: [], themes: [], established_facts: [], unresolved_threads: [], creator_preferences: [] };
  const [b, setB] = useState(bible ?? { ...empty, id: "", series_id: "", updated_at: "" });
  useEffect(() => {
    if (bible) setB(bible);
  }, [bible]);
  const [loc, setLoc] = useState({ name: "", description: "" });
  const hasWorld = !!bible?.world_name;
  const save = () =>
    act(
      "update_world_bible",
      { world_name: b.world_name, geography: b.geography, culture: b.culture, history: b.history, atmosphere: b.atmosphere, rules: b.rules, themes: b.themes, established_facts: b.established_facts, unresolved_threads: b.unresolved_threads, creator_preferences: b.creator_preferences },
      { label: "Saving…" },
    );
  return (
    <div>
      <PanelHeader title="World Bible" hint="The memory every episode is written against. Storymaker flags contradictions instead of changing lore.">
        <Btn variant={hasWorld ? "outline" : "primary"} disabled={!!busy} onClick={() => act("create_world", {}, { label: "Building the world…" })}>
          {hasWorld ? "Regenerate" : "Generate with AI"}
        </Btn>
      </PanelHeader>
      <div className="space-y-4">
        <Field label="World name">
          <input value={b.world_name} onChange={(e) => setB({ ...b, world_name: e.target.value })} className={inputCls} />
        </Field>
        {(["geography", "culture", "history", "atmosphere"] as const).map((k) => (
          <Field key={k} label={k[0]!.toUpperCase() + k.slice(1)}>
            <textarea rows={3} value={b[k]} onChange={(e) => setB({ ...b, [k]: e.target.value })} className={inputCls} />
          </Field>
        ))}
        <LinesField label="Rules of the world" value={b.rules} onChange={(rules) => setB({ ...b, rules })} />
        <LinesField label="Themes" value={b.themes} onChange={(themes) => setB({ ...b, themes })} />
        <LinesField label="Established facts" value={b.established_facts} onChange={(established_facts) => setB({ ...b, established_facts })} />
        <LinesField label="Unresolved story threads" value={b.unresolved_threads} onChange={(unresolved_threads) => setB({ ...b, unresolved_threads })} />
        <LinesField label="Creator preferences" value={b.creator_preferences} onChange={(creator_preferences) => setB({ ...b, creator_preferences })} hint="Things Storymaker should always respect. One per line." />
        <Btn variant="primary" disabled={!!busy} onClick={save}>
          Save World Bible
        </Btn>
      </div>
      <h3 className="mt-10 font-serif text-2xl font-semibold">Recurring locations</h3>
      <ul className="mt-3 space-y-2">
        {snapshot!.locations.map((l) => (
          <li key={l.id} className="rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
            <span className="font-semibold">{l.name}</span>
            <span className="text-mist"> · {l.description}</span>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await act("update_world_bible", { add_locations: [loc] }, { label: "Adding…" });
          if (r.ok) setLoc({ name: "", description: "" });
        }}
      >
        <input required placeholder="Location name" value={loc.name} onChange={(e) => setLoc({ ...loc, name: e.target.value })} className={inputCls} aria-label="Location name" />
        <input placeholder="Description" value={loc.description} onChange={(e) => setLoc({ ...loc, description: e.target.value })} className={inputCls} aria-label="Location description" />
        <Btn variant="outline" type="submit" disabled={!!busy}>
          Add
        </Btn>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ characters */

const CHAR_FIELDS = [
  ["age_range", "Age"],
  ["narrative_role", "Role in the story"],
  ["personality", "Personality"],
  ["backstory", "Backstory"],
  ["motivations", "Motivations"],
  ["voice_profile", "Voice profile"],
  ["arc", "Development arc"],
] as const;

export function CharactersPanel() {
  const { snapshot, act, busy } = useWorkspace();
  const [brief, setBrief] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div>
      <PanelHeader title="Characters" hint="Personality, backstory, voice and arc for everyone in the story." />
      <form
        className="mb-6 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await act("create_character", { brief: brief || undefined, count: 1 }, { label: "Creating a character…" });
          if (r.ok) setBrief("");
        }}
      >
        <input value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. a retired lighthouse keeper named Bram" className={inputCls} aria-label="Character brief" />
        <Btn variant="primary" type="submit" disabled={!!busy} className="shrink-0">
          Add with AI
        </Btn>
      </form>
      {snapshot!.characters.length === 0 ? (
        <Empty>No characters yet. Describe one above, or ask in the chat.</Empty>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {snapshot!.characters.map((c) => (
            <li key={c.id} className="card-surface overflow-hidden">
              {editing === c.id ? <CharacterEditor c={c} onDone={() => setEditing(null)} /> : <CharacterCard c={c} onEdit={() => setEditing(c.id)} />}
            </li>
          ))}
        </ul>
      )}
      <Btn
        className="mt-4"
        variant="outline"
        disabled={!!busy}
        onClick={() => act("create_character", { name: "New character", personality: "To be written.", narrative_role: "" }, { label: "Adding…" })}
      >
        Add a blank character
      </Btn>
    </div>
  );
}

function CharacterCard({ c, onEdit }: { c: Character; onEdit: () => void }) {
  const { act, busy } = useWorkspace();
  return (
    <div className="flex gap-4 p-4">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
        <Artwork spec={c.portrait} title={c.name} variant="square" className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-serif text-xl font-semibold">{c.name}</p>
        <p className="text-xs text-mist">{[c.narrative_role, c.age_range].filter(Boolean).join(" · ")}</p>
        <p className="mt-2">{c.personality}</p>
        {c.motivations && <p className="mt-1 text-mist">Wants: {c.motivations}</p>}
        {c.voice_profile && <p className="mt-1 text-mist">Voice: {c.voice_profile}</p>}
        <div className="mt-2 flex gap-1">
          <Btn className="px-2 py-1 text-xs" onClick={onEdit}>
            Edit
          </Btn>
          <Btn className="px-2 py-1 text-xs" variant="danger" disabled={!!busy} onClick={() => act("delete_character", { character_id: c.id })}>
            Remove
          </Btn>
        </div>
      </div>
    </div>
  );
}

function CharacterEditor({ c, onDone }: { c: Character; onDone: () => void }) {
  const { act, busy } = useWorkspace();
  const [d, setD] = useState(c);
  return (
    <form
      className="space-y-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await act("update_character", { character_id: c.id, name: d.name, ...Object.fromEntries(CHAR_FIELDS.map(([k]) => [k, d[k]])) }, { label: "Saving…" });
        if (r.ok || r.error === "Awaiting confirmation") onDone();
      }}
    >
      <Field label="Name">
        <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={inputCls} />
      </Field>
      {CHAR_FIELDS.map(([k, label]) => (
        <Field key={k} label={label}>
          <textarea rows={k === "backstory" ? 3 : 2} value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} className={inputCls} />
        </Field>
      ))}
      <div className="flex gap-2">
        <Btn variant="primary" type="submit" disabled={!!busy}>
          Save
        </Btn>
        <Btn type="button" onClick={onDone}>
          Cancel
        </Btn>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ relationships */

export function RelationshipsPanel() {
  const { snapshot, act, busy } = useWorkspace();
  const chars = snapshot!.characters;
  const name = (id: string) => chars.find((c) => c.id === id)?.name ?? "Unknown";
  const [f, setF] = useState({ a: chars[0]?.id ?? "", b: chars[1]?.id ?? "", kind: "", description: "" });
  return (
    <div>
      <PanelHeader title="Relationships" hint="How the characters feel about each other, and how that changes." />
      {snapshot!.relationships.length === 0 ? (
        <Empty>No relationships yet.</Empty>
      ) : (
        <ul className="space-y-2">
          {snapshot!.relationships.map((r) => (
            <li key={r.id} className="rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
              <p>
                <span className="font-semibold">{name(r.character_a_id)}</span> <span className="text-mist">and</span> <span className="font-semibold">{name(r.character_b_id)}</span>
                <span className="ml-2 rounded-full bg-lavender/15 px-2 py-0.5 text-xs text-lavender">{r.kind}</span>
              </p>
              <p className="mt-1 text-mist">{r.description}</p>
            </li>
          ))}
        </ul>
      )}
      {chars.length >= 2 && (
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await act("set_relationship", { character_a_id: f.a, character_b_id: f.b, kind: f.kind, description: f.description }, { label: "Saving…" });
            if (r.ok) setF({ ...f, kind: "", description: "" });
          }}
        >
          <h3 className="font-serif text-xl font-semibold">Add or update a relationship</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["a", "b"] as const).map((k) => (
              <select key={k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputCls} aria-label={k === "a" ? "First character" : "Second character"}>
                {chars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <input required placeholder="Kind, e.g. Old friends, Slow-burn romance" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={inputCls} aria-label="Relationship kind" />
          <textarea placeholder="Description" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={inputCls} aria-label="Relationship description" />
          <Btn variant="primary" type="submit" disabled={!!busy || f.a === f.b}>
            Save relationship
          </Btn>
        </form>
      )}
    </div>
  );
}
