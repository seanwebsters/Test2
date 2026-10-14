"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScriptBundle } from "@/lib/storymaker/service";
import { DEFAULT_SCRIPT_SETTINGS, type ContinuityReport, type ScriptSettings } from "@/lib/types";
import { cx, formatDateTime, wordCount } from "@/lib/util";
import { ContinuityCard, SleepCard } from "../Cards";
import { useWorkspace } from "../WorkspaceContext";
import { Btn, Empty, Field, PanelHeader, StatusPill, inputCls } from "../ui";

const REWRITE_BUTTONS: [string, string][] = [
  ["rewrite", "Rewrite"],
  ["expand", "Expand"],
  ["shorten", "Shorten"],
  ["atmospheric", "More atmospheric"],
  ["dialogue", "Improve dialogue"],
  ["sensory", "Add sensory detail"],
  ["relaxing", "More relaxing"],
  ["ending", "Change the ending"],
  ["continuity", "Improve continuity"],
];

const SETTING_OPTIONS: { key: keyof ScriptSettings; label: string; options: (string | number)[] }[] = [
  { key: "duration_minutes", label: "Duration (minutes)", options: [10, 15, 20, 30, 45, 60] },
  { key: "mood", label: "Mood", options: ["dreamy", "cosy", "wistful", "wonder", "tender"] },
  { key: "perspective", label: "Perspective", options: ["third", "first", "second"] },
  { key: "style", label: "Writing style", options: ["lyrical", "storybook", "literary", "minimal"] },
  { key: "dialogue", label: "Dialogue", options: ["none", "light", "moderate"] },
  { key: "romance", label: "Romance intensity", options: ["none", "gentle", "warm"] },
  { key: "pacing", label: "Pacing", options: ["very-slow", "slow", "gentle"] },
];

interface Proposal {
  start: number;
  end: number;
  original: string;
  text: string;
  label: string;
  simulated: boolean;
}

export function ScriptEditor() {
  const { snapshot, episodeId, openEpisode, api, act, busy, refresh, notify } = useWorkspace();
  const episodes = snapshot!.episodes;
  const ep = episodes.find((e) => e.id === episodeId) ?? episodes[0] ?? null;
  const [bundle, setBundle] = useState<ScriptBundle | null>(null);
  const [text, setText] = useState("");
  const [sel, setSel] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [custom, setCustom] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [settings, setSettings] = useState<ScriptSettings>(DEFAULT_SCRIPT_SETTINGS);
  const [continuity, setContinuity] = useState<ContinuityReport | null>(null);
  const [sleep, setSleep] = useState<{ score: number; notes: string[] } | null>(null);
  const [viewing, setViewing] = useState<{ version: number; content: string } | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const currentVersionId = snapshot!.scripts.find((s) => s.episode_id === ep?.id)?.current_version_id ?? null;

  const load = useCallback(async () => {
    if (!ep) return;
    const b = await api<ScriptBundle>(`/api/storymaker/episodes/${ep.id}/script`);
    setBundle(b);
    setText(b.current?.content ?? "");
    setSettings(b.script?.settings ?? DEFAULT_SCRIPT_SETTINGS);
    setProposal(null);
    setViewing(null);
  }, [api, ep]);

  useEffect(() => {
    setContinuity(null);
    setSleep(null);
    void load();
  }, [load, currentVersionId]);

  if (!ep) return <Empty>Plan a season or add an episode first.</Empty>;
  const locked = ["in_review", "approved", "published"].includes(ep.status);
  const dirty = (bundle?.current?.content ?? "") !== text;
  const selected = text.slice(sel.start, sel.end);

  async function save(content: string, note: string, source: "human" | "ai_rewrite" = "human") {
    setWorking("Saving…");
    try {
      const b = await api<ScriptBundle>(`/api/storymaker/episodes/${ep!.id}/script`, { method: "PUT", body: JSON.stringify({ content, note, source }) });
      setBundle(b);
      setText(b.current?.content ?? content);
      await refresh();
      notify(`Saved as version ${b.current?.version}.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not save");
    } finally {
      setWorking(null);
    }
  }

  async function rewrite(action: string | null, label: string) {
    if (!selected.trim()) return;
    setWorking(`${label}…`);
    try {
      const out = await api<{ text: string; simulated: boolean }>(`/api/storymaker/episodes/${ep!.id}/rewrite`, {
        method: "POST",
        body: JSON.stringify(action ? { selection: selected, action } : { selection: selected, instruction: custom }),
      });
      setProposal({ start: sel.start, end: sel.end, original: selected, text: out.text, label, simulated: out.simulated });
    } catch (err) {
      notify(err instanceof Error ? err.message : "Rewrite failed");
    } finally {
      setWorking(null);
    }
  }

  async function acceptProposal() {
    if (!proposal) return;
    const next = text.slice(0, proposal.start) + proposal.text + text.slice(proposal.end);
    setProposal(null);
    await save(next, `AI rewrite: ${proposal.label}`, "ai_rewrite");
  }

  async function runCheck(kind: "continuity" | "sleep") {
    setWorking(kind === "continuity" ? "Checking continuity…" : "Checking sleep suitability…");
    try {
      const out = await api<{ continuity?: ContinuityReport; sleep?: { score: number; notes: string[] } }>(`/api/storymaker/episodes/${ep!.id}/checks`, { method: "POST", body: JSON.stringify({ kind, text }) });
      if (out.continuity) setContinuity(out.continuity);
      if (out.sleep) setSleep(out.sleep);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Check failed");
    } finally {
      setWorking(null);
    }
  }

  async function writeWithSettings() {
    await api(`/api/storymaker/episodes/${ep!.id}/script`, { method: "PATCH", body: JSON.stringify({ settings }) }).catch(() => null);
    await act("write_episode", { episode_id: ep!.id, settings }, { label: `Writing “${ep!.title}”…` });
  }

  const isBusy = !!busy || !!working;

  return (
    <div>
      <PanelHeader title="Scripts">
        <label className="sr-only" htmlFor="script-episode">
          Episode
        </label>
        <select id="script-episode" value={ep.id} onChange={(e) => openEpisode(e.target.value)} className={cx(inputCls, "max-w-xs")}>
          {episodes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.number}. {e.title}
            </option>
          ))}
        </select>
      </PanelHeader>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-mist">
        <StatusPill status={ep.status} />
        {bundle?.current && (
          <span>
            Version {bundle.current.version} · {bundle.current.word_count.toLocaleString()} words · about {Math.round(bundle.current.word_count / 110)} min read slowly
            {bundle.current.simulated && <span className="ml-1 text-amber-200/80">· simulated writer</span>}
          </span>
        )}
        {working && (
          <span role="status" className="text-lavender">
            {working}
          </span>
        )}
      </div>
      {locked && <p className="mb-3 rounded-2xl bg-amber-300/10 px-4 py-2 text-sm text-amber-100">This script is locked while the episode is {ep.status.replace("_", " ")}.</p>}

      {!bundle?.current && !text ? (
        <div className="card-surface space-y-4 p-5">
          <p className="text-sm text-mist">No script yet. Choose settings and Storymaker will write the full narration.</p>
          <SettingsGrid settings={settings} onChange={setSettings} />
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" disabled={isBusy || locked} onClick={writeWithSettings}>
              Write this episode
            </Btn>
            <Btn variant="outline" disabled={isBusy || locked} onClick={() => setText(" ")}>
              Write it myself
            </Btn>
          </div>
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-10 -mx-1 mb-2 flex flex-wrap gap-1 bg-night/95 px-1 py-2 backdrop-blur" role="toolbar" aria-label="Rewrite selected text">
            {REWRITE_BUTTONS.map(([action, label]) => (
              <button
                key={action}
                disabled={!selected.trim() || isBusy || locked}
                onClick={() => rewrite(action, label)}
                className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-mist hover:border-lavender/60 hover:text-white disabled:opacity-35"
              >
                {label}
              </button>
            ))}
            <form
              className="flex min-w-[12rem] flex-1 gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.trim()) void rewrite(null, custom.trim());
              }}
            >
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Or describe a change…" aria-label="Custom rewrite instruction" className={cx(inputCls, "py-1 text-xs")} disabled={locked} />
              <button type="submit" disabled={!selected.trim() || !custom.trim() || isBusy || locked} className="rounded-full bg-lavender/20 px-3 text-xs text-lavender disabled:opacity-35">
                Go
              </button>
            </form>
          </div>
          <p className="mb-2 text-[11px] text-mist">{selected.trim() ? `${wordCount(selected)} words selected.` : "Select a passage to rewrite it. Changes are proposed first; nothing is replaced until you accept."}</p>

          {proposal && (
            <div className="mb-4 rounded-2xl border border-lavender/40 bg-lavender/10 p-4 text-sm">
              <p className="text-xs uppercase tracking-wider text-lavender">
                Proposed: {proposal.label}
                {proposal.simulated ? " · simulated" : ""}
              </p>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[11px] text-mist">Before</p>
                  <p className="mt-1 whitespace-pre-wrap text-mist line-through decoration-white/20">{proposal.original}</p>
                </div>
                <div>
                  <p className="text-[11px] text-mist">After</p>
                  <p className="mt-1 whitespace-pre-wrap">{proposal.text}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Btn variant="primary" className="px-3 py-1.5 text-xs" onClick={acceptProposal} disabled={isBusy}>
                  Accept
                </Btn>
                <Btn className="px-3 py-1.5 text-xs" onClick={() => rewrite(REWRITE_BUTTONS.find(([, l]) => l === proposal.label)?.[0] ?? null, proposal.label)} disabled={isBusy}>
                  Try again
                </Btn>
                <Btn className="px-3 py-1.5 text-xs" onClick={() => setProposal(null)}>
                  Discard
                </Btn>
              </div>
            </div>
          )}

          <label htmlFor="script-text" className="sr-only">
            Script
          </label>
          <textarea
            id="script-text"
            ref={ta}
            value={text}
            readOnly={locked}
            onChange={(e) => setText(e.target.value)}
            onSelect={(e) => setSel({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd })}
            className="min-h-[50vh] w-full resize-y rounded-2xl border border-white/10 bg-night-2 p-5 font-serif text-lg leading-relaxed focus:border-lavender/50 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn variant="primary" disabled={!dirty || isBusy || locked} onClick={() => save(text, "Edited by creator")}>
              Save as new version
            </Btn>
            <Btn disabled={!dirty} onClick={() => setText(bundle?.current?.content ?? "")}>
              Discard edits
            </Btn>
            <Btn variant="outline" disabled={isBusy || !text.trim()} onClick={() => runCheck("continuity")}>
              Check continuity
            </Btn>
            <Btn variant="outline" disabled={isBusy || !text.trim()} onClick={() => runCheck("sleep")}>
              Sleep suitability
            </Btn>
          </div>
          <div className="mt-4 space-y-3">
            {continuity && <ContinuityCard report={continuity} />}
            {sleep && <SleepCard score={sleep.score} notes={sleep.notes} />}
          </div>

          <details className="card-surface mt-6 p-5">
            <summary className="cursor-pointer font-serif text-xl font-semibold">Script settings</summary>
            <div className="mt-4 space-y-4">
              <SettingsGrid settings={settings} onChange={setSettings} />
              <div className="flex flex-wrap gap-2">
                <Btn variant="outline" disabled={isBusy || locked} onClick={() => api(`/api/storymaker/episodes/${ep.id}/script`, { method: "PATCH", body: JSON.stringify({ settings }) }).then(() => notify("Settings saved."))}>
                  Save settings
                </Btn>
                <Btn variant="primary" disabled={isBusy || locked} onClick={writeWithSettings}>
                  Rewrite whole episode with these settings
                </Btn>
              </div>
              <p className="text-xs text-mist">Rewriting creates a new version; you can always roll back.</p>
            </div>
          </details>

          <section className="mt-6">
            <h3 className="font-serif text-2xl font-semibold">Versions</h3>
            <ol className="mt-3 space-y-2">
              {bundle?.versions.map((v) => (
                <li key={v.id} className={cx("flex flex-wrap items-center gap-2 rounded-2xl px-4 py-2.5 text-sm", v.id === bundle.current?.id ? "bg-lavender/10" : "bg-white/[0.04]")}>
                  <span className="font-semibold">v{v.version}</span>
                  <span className="text-mist">{v.note}</span>
                  <span className="text-xs text-mist">
                    {v.source.replace("_", " ")}
                    {v.simulated ? " (simulated)" : v.model ? ` · ${v.model}` : ""} · {v.word_count.toLocaleString()} words · {formatDateTime(v.created_at)}
                  </span>
                  <span className="ml-auto flex gap-1">
                    {v.id === bundle.current?.id ? (
                      <span className="text-xs text-lavender">Current</span>
                    ) : (
                      <>
                        <Btn
                          className="px-2 py-1 text-xs"
                          onClick={async () => {
                            const full = await api<{ version: number; content: string }>(`/api/storymaker/episodes/${ep.id}/versions/${v.id}`);
                            setViewing(full);
                          }}
                        >
                          View
                        </Btn>
                        <Btn
                          variant="outline"
                          className="px-2 py-1 text-xs"
                          disabled={isBusy || locked}
                          onClick={async () => {
                            setWorking("Restoring…");
                            try {
                              const b = await api<ScriptBundle>(`/api/storymaker/episodes/${ep.id}/versions/${v.id}`, { method: "POST" });
                              setBundle(b);
                              setText(b.current?.content ?? "");
                              await refresh();
                              notify(`Restored version ${v.version} as version ${b.current?.version}.`);
                            } finally {
                              setWorking(null);
                            }
                          }}
                        >
                          Restore
                        </Btn>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            {viewing && (
              <div className="mt-3 rounded-2xl border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wider text-mist">Version {viewing.version} (read only)</p>
                  <Btn className="px-2 py-1 text-xs" onClick={() => setViewing(null)}>
                    Close
                  </Btn>
                </div>
                <p className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap font-serif text-base leading-relaxed text-mist">{viewing.content}</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SettingsGrid({ settings, onChange }: { settings: ScriptSettings; onChange: (s: ScriptSettings) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {SETTING_OPTIONS.map((o) => (
        <Field key={o.key} label={o.label}>
          <select
            value={String(settings[o.key])}
            onChange={(e) => onChange({ ...settings, [o.key]: o.key === "duration_minutes" ? Number(e.target.value) : e.target.value })}
            className={inputCls}
          >
            {o.options.map((x) => (
              <option key={x} value={String(x)}>
                {String(x).replace("-", " ")}
              </option>
            ))}
          </select>
        </Field>
      ))}
    </div>
  );
}
